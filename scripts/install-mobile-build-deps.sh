#!/usr/bin/env bash

script_path="`realpath "$0"`"
script_dir="`dirname "$script_path"`"
base_dir="`dirname "$script_dir"`"

cd "$base_dir"

do_android=1
do_sudo=1

function get_linux_os {
  . /etc/os-release
  if [ "$ID" != "" ]
    then
      echo $ID
    else
      echo unknown
  fi
}

uname_os=$(uname)
if [ "$uname_os" == "Linux" ]
  then
    os=linux-$(get_linux_os)
elif [ "$uname_os" == "Darwin" ]
  then
    os=macos
else
    os=unknown
fi

function npx_run_script() {
  # this uses npx to temporarily run a script with required packages
  # useful for bootstrapping before doing an install
  # syntax npx_run_script "pkg [pkg ...]" script [args...]
  packages="$1"
  package_args=$(for pkg in $packages ; do echo "-p $pkg" ; done)
  shift 1
  npx $package_args 'NODE_PATH=$(echo "const path = require(\"node:path\") ; const bin_dir=process.env.PATH.split(\":\")[0] ; const mod_dir=path.dirname(bin_dir) ; console.log(mod_dir)" | node):$NODE_PATH' node "$@"
}

function potential_android_homes {
  echo hmmmm >&2
  if [ "$os" == "macos" ]
    then
      echo /opt/homebrew/share/android-commandlinetools
  elif [[ "$os" == "linux" || "${os/linux-/}" != "${os}" ]]
    then
      echo lmmmm >&2
      echo "$HOME/Android/Sdk/"
  else
      echo pmmmm$os >&2
      echo "Could not determine potential android home" "for OS $os" >&2
  fi
}

function check_android_home {
  if [ "$ANDROID_HOME" == "" ]
    then
      for potential_android_home in $(potential_android_homes)
        do
          if [ "$potential_android_home" != "" ] && [ -d "$potential_android_home" ]
            then
              export ANDROID_HOME="$potential_android_home"
              echo $potential_android_home
              return 0
	    else
	      echo "$potential_android_home" not found
            fi
        done
      if [ "$ANDROID_HOME" == "" ]
        then
          echo "Android Sdk not found:" "set ANDROID_HOME in $params_file to point to sdk install"
          return 1
        fi
  elif [ -d "$ANDROID_HOME" ]
    then
      return 0
  else
      echo "Android Sdk not found:" "ANDROID_HOME in $params_file points to $ANDROID_HOME but it doesn't exist"
      return 1
  fi
}

function exec_sudo() {
  if [ "$do_sudo" == 1 ]; then
    sudo "$@"
  else
    echo "sudo command required but --no-sudo given" "please run the following command manually:"
    echo "sudo $@"
  fi
}

if ! which docker >/dev/null
  then
    echo "Docker install required" "in order to use this self-hosting environment"
    echo "Please install docker manually" "by following the docker installation instructions"
    exit 1
  fi
if [ "$os" == "linux-ubuntu" ]
  then
    echo "Setting up apt packages" that are requirements for building running and testing these docker images
    # make is used to run setup scripts etc
    # pwgen is used to generate new securish passwords
    # jq in are used in extracting json data for config and tests
    apt_packages="make pwgen jq unzip gnupg ca-certificates curl"

    if dpkg-query -s $apt_packages >/dev/null
      then
        echo "No install required:" all packages already installed
      else
        exec_sudo apt update
        exec_sudo apt install -y $apt_packages
      fi

    echo "Setting up snap packages" that are requirements for building running and testing these docker images
    # yq is used in extracting yaml data for config and tests; the current ubuntu apt package is 3.x, but we want 4.x
    snap_packages="yq"
    old_apt_packages="yq"
    if dpkg-query -l $old_apt_packages 2>/dev/null
      then
        echo "Old version of $old_apt_packages found" "installed using apt; will remove and install snap version"
        exec_sudo apt remove $old_apt_packages
    fi
    if snap list $snap_packages 2>/dev/null
      then
        echo "No install required:" all packages already installed
      else
        exec_sudo snap install $snap_packages
      fi
    
    echo "Setting up websocat" directly from executable download, in /usr/local/bin
    if [ -x /usr/local/bin/websocat ] && websocat --version
      then
        echo "No install required:" websocat already present
      else
        (exec_sudo curl -o /usr/local/bin/websocat -L https://github.com/vi/websocat/releases/download/v1.13.0/websocat.x86_64-unknown-linux-musl; exec_sudo chmod a+x /usr/local/bin/websocat)
      fi

    # Zulu Java needs a separate repository set up
    echo "Setting up Zulu JDK" "using azul debian repository"
    need_apt_update=0
    [ -f /usr/share/keyrings/azul.gpg ] || {  echo will set up repo key ; curl -s https://repos.azul.com/azul-repo.key | sudo gpg --dearmor -o /usr/share/keyrings/azul.gpg ; need_apt_update=1 ; }
    [ -f /etc/apt/sources.list.d/zulu.list ] || { echo will set up deb repository ; echo "deb [signed-by=/usr/share/keyrings/azul.gpg] https://repos.azul.com/zulu/deb stable main" | sudo tee /etc/apt/sources.list.d/zulu.list ; need_apt_update=1 ; }
    [ "$need_apt_update" == 1 ] && sudo apt update
    dpkg-query -l zulu17-jdk || { echo installing ; sudo apt install zulu17-jdk -y ; }
elif [ "$os" == "macos" ]
  then
    if which brew >/dev/null
      then
        required_packages= 
        for pkg in make pwgen jq yq websocat inkscape imagemagick semgrep comby python fastlane cocoapods expo-orbit watchman zulu@17 android-platform-tools android-commandlinetools bundletool go pnpm json5 watchexec crowdin go expect
          do
            cmd=$pkg
            check_cmd=which
            [ "$pkg" == "imagemagick" ] && cmd=magick
            [ "$pkg" == "python" ] && cmd=python3
            [ "$pkg" == "cocoapods" ] && cmd=pod
            [ "$pkg" == "expo-orbit" ] && check_cmd="brew list"
            [ "${pkg/android/}" != "$pkg" ] && check_cmd="brew list"
            [ "${pkg/zulu/}" != "$pkg" ] && check_cmd="brew list"
            $check_cmd $cmd > /dev/null || required_packages="$required_packages $pkg"
          done
        if [ "$required_packages" == "" ]
          then
            echo "All requirements met" so not installing brew packages
          else
            echo "Setting up brew packages" that are requirements for building ios app on macos: $required_packages
            brew install $required_packages
          fi
      else
        echo "Brew not found but is required:" please install homebrew before continuing
        exit 1
      fi
  echo "Checking other build requirements" "for iOS builds"

  # Check required certificates - see https://stackoverflow.com/a/78231028/120398 
  target_keychain=~/Library/Keychains/login.keychain-db
  # to get these sha checks, download the certificate and then openssl x509 -noout -fingerprint -sha1 -inform der -in ~/Downloads/AppleWWDRCAG3.cer | sed 's/://g'
  for cert_sha_pair in AppleWWDRCAG3.cer:06EC06599F4ED0027CC58956B4D3AC1255114F35 AppleWWDRCAG6.cer:0BE38BFE21FD434D8CC51CBE0E2BC7758DDBF97B
    do
      cert_filename="${cert_sha_pair%:*}"
      cert_sha="${cert_sha_pair#*:}"
      if ! security find-certificate -a -c "Apple Worldwide Developer Relations Certification Authority" -Z "${target_keychain}" | grep ${cert_sha} >/dev/null
        then
          echo "Installing certificate" $cert_filename
          curl https://www.apple.com/certificateauthority/$cert_filename -o ~/Downloads/$cert_filename
          security add-trusted-cert -d -r unspecified -k "${target_keychain}" ~/Downloads/$cert_filename
        fi
    done

  # Check Xcode location - see https://stackoverflow.com/a/19529693/120398
  # This could be done differently e.g. checking that the right executables are available at this location
  expected_xcode=/Applications/Xcode.app/Contents/Developer
  if [ "$(xcode-select -p)" != "$expected_xcode" ]
    then
      echo "Correcting xcode location" "which will require password for sudo rights"
      exec_sudo xcode-select -s "$expected_xcode"
    fi
fi

echo "Setting up nvm" and node
export NVM_DIR="$HOME/.nvm"
export NVM_VER=0.40.1
export NODE_VER=20
if [ ! -d "$NVM_DIR/.git" ]
  then
    echo "Installing nvm" version $NVM_VER
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VER/install.sh | bash
  fi
# this is manually sourcing nvm so we can use its functions
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
echo "Checking node" version $NODE_VER
nvm ls $NODE_VER || {
  echo "Installing node" version $NODE_VER
  nvm install $NODE_VER
}

echo "Checking yarn" "in node $NODE_VER"
(
  nvm use $NODE_VER
  which yarn > /dev/null || npm install -g yarn
)

echo "Checking pnpm" "in node $NODE_VER"
(
  nvm use $NODE_VER
  which pnpm > /dev/null || npm install -g pnpm
)

if [ "$do_android" == 1 ]; then
  echo "Installing Android tools" "and checking that licenses have been accepted (on $os)"

  new_android_home=$(check_android_home) || {
    echo "Android home not found" "please configure ANDROID_HOME and run again"
    echo -1 "Default location for ANDROID_HOME" "$(potential_android_homes | head -n 1)"
    echo -1 "Set ANDROID_HOME" "then mkdir \$ANDROID_HOME and run again"
    exit 1
  }
  if [ "$new_android_home" != "" ]
    then
      export ANDROID_HOME="$new_android_home"
      echo "Default Android SDK" "found at $ANDROID_HOME"
    fi

  if [ "${os/linux/}" != "$os" ]
    then
      # we have to install cmdline-tools manually on Linux
      [ -d $ANDROID_HOME/cmdline-tools ] || {
        echo "Installing Android SDK Manager" "into $ANDROID_HOME"
        downloads_dir="$base_dir/downloads"
        mkdir -p "$downloads_dir"
        commandlinetools_url="$(curl -s 'https://developer.android.com/studio#command-line-tools-only' | grep 'href="[^"]*commandlinetools-linux.*latest[.]zip"' | sed 's/^.*href="\([^"]*\)".*/\1/g')"
        commandlinetools_zip="$downloads_dir/$(basename "$commandlinetools_url")"
        [ -f "$commandlinetools_zip" ] || {
          echo "Downloading latest commandlinetools" "from $commandlinetools_url into $commandlinetools_zip"
          curl -o "$commandlinetools_zip" "$commandlinetools_url" || { echo "Could not download" "$commandlinetools_url" ; exit 1 ; }
        }
        echo "Unpacking latest commandlinetools" "from $commandlinetools_zip into $ANDROID_HOME"
        unzip -d "$ANDROID_HOME" "$commandlinetools_zip"
      }
      sdkmanager_params="--sdk_root=$ANDROID_HOME"
    fi

  which sdkmanager >/dev/null 2>&1 || export PATH="$PATH:$ANDROID_HOME/cmdline-tools/bin"

  which sdkmanager >/dev/null 2>&1 || {
    echo "Android SDK Manager not found;" "check that you have the commandlinetools installed"
    exit 1
  }

  echo "Checking License Acceptance" "for Android SDK packages; accept as required"
  sdkmanager $sdkmanager_params --licenses

  echo "Checking Android Versions" "configured in social-app"
  android_versions="$(npx_run_script @dotenvx/dotenvx $script_dir/scripts/get-social-app-android-build-properties.js)"
  android_platform="$(echo "$android_versions" | jq -r .compileSdkVersion)"
  android_build_tools="$(echo "$android_versions" | jq -r .buildToolsVersion)"
  # - In "SDK Platforms": "Android x" (where x is Android's current version).
  # - In "SDK Tools": "Android SDK Build-Tools" and "Android Emulator" are required.
  android_reqs="platform-tools platforms;android-$android_platform build-tools;$android_build_tools emulator ndk"
  android_installed="$(sdkmanager $sdkmanager_params --list_installed)"
  needed_android_reqs=""
  for android_req in $android_reqs
    do
      echo "$android_req" | grep "$android_req" >/dev/null || needed_android_reqs="$needed_android_reqs $android_req"
    done
  if [ "$needed_android_reqs" != "" ]
    then
      for android_req in $android_reqs
        do
          echo "Installing Android SDK" "$android_req"
          sdkmanager $sdkmanager_params --install $android_req
        done
    else
      echo "Android SDK requirements already installed:" "no install required"
    fi
fi
