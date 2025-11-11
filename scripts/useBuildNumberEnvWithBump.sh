#!/bin/bash
build_profile_args=
[ "$build_profile" -ne "" ] && build_profile_args="-e $build_profile"
outputIos=$(npx eas-cli build:version:get -p ios $build_profile_args)
outputAndroid=$(npx eas-cli build:version:get -p android $build_profile_args)
currentIosVersion=${outputIos#*buildNumber - }
currentAndroidVersion=${outputAndroid#*versionCode - }

BSKY_IOS_BUILD_NUMBER=$((currentIosVersion+1))
BSKY_ANDROID_VERSION_CODE=$((currentAndroidVersion+1))

bash -c "BSKY_IOS_BUILD_NUMBER=$BSKY_IOS_BUILD_NUMBER BSKY_ANDROID_VERSION_CODE=$BSKY_ANDROID_VERSION_CODE $*"

