import * as nconf from "nconf";

function loadConfig() {
    const n = nconf
        .env({"separator": "__", "parseValues": true})
        .file({"file": "mue.config.json", "dir": "../"})
        .defaults({
            "port": 8888,
            "target_url": "http://localhost:3000/"
        });
    n.load();
    return n;
}

const configEnv = loadConfig();

export const config = {
    "port": configEnv.get("port") as number,
    "target_url": configEnv.get("target_url") as string
};
