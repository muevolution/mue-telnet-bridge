import "source-map-support/register";

import { AuthRequest, ClientToServer, ServerToClient } from "@mue/client-types";
import * as net from "net";
import * as readline from "readline";
import * as socketio from "socket.io-client";

import { TypedEmitter } from "./common";
import { config } from "./config";
import { initLogger, Logger } from "./logging";

initLogger();

const server = net.createServer((cSocket) => {
    const address = (cSocket.address() as net.AddressInfo).address;
    Logger.debug("CONNECT > " + address);

    let isAuthenticated = false;
    let authInfo: AuthRequest = null;

    const sSocket = socketio(config.target_url);
    const tsock = new TypedEmitter<ClientToServer, ServerToClient>(sSocket);

    const rl = readline.createInterface({
        "input": cSocket
    });

    cSocket.on("end", () => {
        Logger.debug("DISCONNECT > " + address);
        tsock.emit("close", "User disconnected");
        sSocket.close();
    });

    cSocket.on("error", (err) => {
        Logger.debug("Socket got error", err);
        tsock.emit("close", "User connection encountered an error");
        sSocket.close();
    });

    rl.on("line", (data: string) => {
        if (!isAuthenticated) {
            if (data.startsWith("auth ") || data.startsWith("connect ")) {
                // Authenticate the user
                const split = data.split(" ");
                if (split.length < 3) {
                    return cSocket.write("TS> Not enough auth arguments\n");
                }

                authInfo = {"username": split[1], "password": split[2]};
                return tsock.emit("auth", authInfo);
            } else if (data.startsWith("quit")) {
                cSocket.write("TS> Goodbye.\n");
                tsock.emit("close", "Client closed");
                sSocket.close();
                cSocket.destroy();
            }
        } else {
            return tsock.emit("command", {"line": data});
        }
    });

    tsock.on("welcome", (motd) => {
        cSocket.write("SYS> Connected to telnet bridge\n");
        cSocket.write(`MOTD> ${motd}\n`);

        isAuthenticated = false;
        if (authInfo) {
            // Reauthenticate with existing credentials
            cSocket.write("TS> It looks like we got disconnected. Reauthenticating...\n");
            return tsock.emit("auth", authInfo);
        }
    });

    tsock.on("auth", (data) => {
        if (data.success) {
            cSocket.write(`AUTH> Success: ${data.message}\n`);
            isAuthenticated = true;
        } else {
            cSocket.write(`AUTH> Failed: ${data.message}\n`);
            isAuthenticated = false;
            authInfo = null;
        }
    });

    tsock.on("message", (data) => {
        cSocket.write(`[${data.target}] ${data.message}\n`);
        if (data.meta) {
            cSocket.write(`>META> ${JSON.stringify(data.meta)}\n`);
        }
    });

    tsock.on("close", (reason) => {
        Logger.debug("QUIT > " + (cSocket.address() as net.AddressInfo).address);
        cSocket.write(`QUIT> ${reason ? reason : "No reason given"}\n`);
        sSocket.close();
        cSocket.destroy();
    });

    tsock.on("fatal", (data) => {
        cSocket.write(`ERR> Got fatal error: ${data}\n`);
        sSocket.close();
        cSocket.destroy();
    });

    tsock.on("error", (err) => {
        cSocket.write(`ERR> Got connection error: ${err}\nTS> Attempting to reconnect.\n`);
        isAuthenticated = false;
    });

});

server.on("error", (err) => {
    Logger.error("Server got error", err);
});

Logger.info(`Listening on port ${config.port}`);
server.listen(config.port);
