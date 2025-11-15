# M&O Store — Admin (Control Panel)

This is the React-based Admin SPA for M&O Store. It manages products, promotions, users and orders and integrates with the server API.

Quick start (development)

1. Install dependencies and run the dev server:

```bash
cd "c:/Users/moham/Desktop/MO Store/admin"
npm install
npm start
```

2. The dev server runs on `http://localhost:3002` (or the default CRA port if occupied). The admin `api.js` helper uses `process.env.REACT_APP_API_BASE` to set the API base path (defaults to `/api`).

Environment variables

- `REACT_APP_API_BASE` — Base path for API requests (default: `/api`). For example set `REACT_APP_API_BASE=https://api.yourdomain.com/api` if your API is hosted elsewhere.

Build & Docker

The repo includes a `Dockerfile` that builds the admin app and serves it with nginx. The image accepts a build-arg `REACT_APP_API_BASE` to bake the API base URL into the static bundle.

Build and run the image:

```bash
cd "c:/Users/moham/Desktop/MO Store/admin"
docker build -t mo-store-admin --build-arg REACT_APP_API_BASE="https://api.yourdomain.com/api" .
docker run -p 8081:80 mo-store-admin
```

Open `http://localhost:8081` to access the admin panel.

CSRF / Auth notes

-- Admin uses cookie-based auth. The admin `api.js` helper sends credentials with requests but no longer requests or attaches a separate CSRF token header.

Deployment notes

- If serving admin and API from different origins, ensure the API `CLIENT_ORIGIN` allows the admin origin and cookies are configured (`SameSite`/`secure`) appropriately.
- For CI/CD, build the admin Docker image with `REACT_APP_API_BASE` set to your API URL so the static bundle points to the correct API.

Useful scripts

- Start dev server: `npm start`
- Build: `npm run build` (the Dockerfile runs this during image build)

If you want, I can:
- Add a simple GitHub Actions workflow that builds the admin Docker image and optionally pushes to a registry.
- Add health-check endpoints or an admin-only static build served by the server.

Last updated: 2025-11-15
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
