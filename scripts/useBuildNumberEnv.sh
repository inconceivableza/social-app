#!/bin/bash
build_profile_args=
[ "$build_profile" -ne "" ] && build_profile_args="-e $build_profile"
outputIos=$(npx eas-cli build:version:get -p ios $build_profile_args)
outputAndroid=$(npx eas-cli build:version:get -p android $build_profile_args)
BSKY_IOS_BUILD_NUMBER=${outputIos#*buildNumber - }
BSKY_ANDROID_VERSION_CODE=${outputAndroid#*versionCode - }

bash -c "BSKY_IOS_BUILD_NUMBER=$BSKY_IOS_BUILD_NUMBER BSKY_ANDROID_VERSION_CODE=$BSKY_ANDROID_VERSION_CODE $*"
