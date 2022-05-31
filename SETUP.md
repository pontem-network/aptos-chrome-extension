# Setup development environment

### Install & Link dependencies of packages
- Go to `./packages` and in each folder run `yarn` command.
- Run `./development/packages-link.sh` script. This will create all npm links between packages and main package.
- Packages in list need to be built in order for the changes to be applied in the main project.:
  - `pontem-block-tracker`
  - `pontem-controllers`
  - `pontem-nonce-tracker`
  - `pontem-util`
  - `pontem-providers`
  - `pontem-json-rpc-middleware`
  - `pontem-wallet`
  - `pontem-token-tracker`

Before the first run, be sure to build these packages.
Pay attention to the version of nodejs in each project for build.

### Run main build
- Install all dependencies `yarn` in root.
- Run `yarn setup` for run lavamoat registry.
- If it first usage, or you added new dependency in code - run `yarn lavamoat:auto` for generating new lock file for every dependency in project. It's a long operation (5-7-10 minutes)
- For debugging you should install globally `yarn global add remotedev-server`
- Run `yarn start:dev` for development
- For more see Readme file.
