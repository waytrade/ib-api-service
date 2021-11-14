# How to authenticate on SwaggerUI

1. Open SwaggerUI on your browser (e.g. http://localhost:3000), expand the Authentication endpoint and click `Try it out`:

<img src="res/auth_tryout.png" alt="drawing" width="800"/>

2. Edit the request body to contain the REST_API_USERNAME / REST_API_PASSWORD credentials from the .env file and click on `Execute`.

<img src="res/auth_execute.png" alt="drawing" width="800"/>

3. Find the authorization header on response and copy the JWT token (that is everything after 'Bearer '):

<img src="res/auth_bearer.png" alt="drawing" width="800"/>

4. Scroll to top of page and click the `Authorize` button:

<img src="res/authorize.png" alt="drawing" width="800"/>

5. Paste the JWT token from step 3, click `Authorize` and `Close`.

<img src="res/authorize_bearer.png" alt="drawing" width="800"/>

\
You are now authenticated and can use other API endpoints without getting error 401.
