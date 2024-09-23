const head = document.getElementsByTagName('head')[0];
const script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js';
head.appendChild(script);
let environments = JSON.parse(localStorage.getItem('environments')) || {};
window.addEventListener(
    'DOMContentLoaded',
    () => {
        setTimeout(() => {
            for (let key in environments) {
                if (key === 'token') {
                    setToken(environments[key]);
                }
            }
        }, 3000);
    },
    false
);

function getMethodByRequest(request, response) {
    let url = new URL(request.url);
    let paths = ui.getConfigs().spec.paths;
    for (let path in ui.getConfigs().spec.paths) {
        if (path === url.pathname) {
            let method = paths[path][request.method.toLowerCase()];
            if (method && method.actionSetValue) {
                if (response && response.status >= 200 && response.status < 300) {
                    return method.actionSetValue;
                }
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleRequest(request, response) {
    let actionSetValue = getMethodByRequest(request, response);
    if (actionSetValue) {
        for (let action of actionSetValue) {
            if (action.key === 'token') {
                setToken(_.get(response.body, action.value));
            }
            environments[action.key] = _.get(response.body, action.value);
        }
    }
    localStorage.setItem('environments', JSON.stringify(environments));
}

function setToken(token) {
    ui.authActions.authorizeWithPersistOption({
        bearer: {
            name: 'bearer',
            schema: {
                scheme: 'bearer',
                bearerFormat: 'JWT',
                type: 'http'
            },
            value: token
        }
    });
}
