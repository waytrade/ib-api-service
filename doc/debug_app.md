# Building and debuggin the App

1.  Clone this repo

        git clone https://github.com/waytrade/ib-api-service.git
        cd ib-api-service

2.  Create a `.npmrc` file\
    `@waytrade` packages are not hosted on **npm.js but on github**.\
    Since Github does not allow unauthenticated access, you first need to create personal access on https://github.com/settings/tokens (make sure `read:packages` is checked!) and paste it into a .npmrc file with the following content:

            @waytrade:registry=https://npm.pkg.github.com
            //npm.pkg.github.com/:_authToken=<yourPersonalAcessToken>

    For being able to access those packages you need to configure npm properly. Do this by adding
