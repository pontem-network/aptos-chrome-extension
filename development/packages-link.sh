#!/usr/bin/env bash

SRC_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGES_DIR=$SRC_DIR"/../packages"

cd $PACKAGES_DIR/pontem-aptos-middleware && bash ./link.sh
cd $PACKAGES_DIR/pontem-block-tracker && bash ./link.sh
cd $PACKAGES_DIR/pontem-query && bash ./link.sh
cd $PACKAGES_DIR/pontem-token-tracker && bash ./link.sh
cd $PACKAGES_DIR/pontem-controllers && bash ./link.sh
cd $PACKAGES_DIR/pontem-nonce-tracker && bash ./link.sh
cd $PACKAGES_DIR/pontem-hdkey && bash ./link.sh
cd $PACKAGES_DIR/pontem-util && bash ./link.sh
cd $PACKAGES_DIR/pontem-wallet && bash ./link.sh
cd $PACKAGES_DIR/pontem-hd-keyring && bash ./link.sh
cd $PACKAGES_DIR/pontem-keyring-controller && bash ./link.sh
cd $PACKAGES_DIR/pontem-json-rpc-middleware && bash ./link.sh
cd $PACKAGES_DIR/pontem-json-rpc-filters && bash ./link.sh
cd $PACKAGES_DIR/pontem-providers && bash ./link.sh

cd $SRC_DIR/..

yarn link @pontem/pontem-aptos-middleware
yarn link @pontem/pontem-block-tracker
yarn link @pontem/pontem-query
yarn link @pontem/pontem-token-tracker
yarn link @pontem/pontem-controllers
yarn link @pontem/nonce-tracker # TODO rename to @pontem/pontem-nonce-tracker
yarn link @pontem/pontem-hdkey
yarn link @pontem/pontem-util
yarn link @pontem/pontem-wallet
yarn link @pontem/pontem-hd-keyring
yarn link @pontem/pontem-keyring-controller
yarn link @pontem/pontem-json-rpc-middleware
yarn link @pontem/pontem-json-rpc-filters
yarn link @pontem/pontem-providers
