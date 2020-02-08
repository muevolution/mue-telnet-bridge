// tslint:disable:max-classes-per-file

import { MessageEvent } from "@muevolution/client-types";

import { Logger } from "./logging";

interface CompatibleEmitter {
    emit(event: string, ...args: any[]): any;
    on(event: string, listener: (data: any) => void): any;
}

export class BaseTypedEmitter<O, I> {
    constructor(protected socket: CompatibleEmitter) {}

    public emit<T extends Extract<keyof O, string>, K extends O[T]>(event: T, data: K) {
        return this.socket.emit(event, data);
    }

    public on<T extends Extract<keyof I, string>, K extends I[T]>(event: T, listener: (data: K) => (Promise<any> | void), errorHandler?: (err: any) => any) {
        return this.socket.on(event, (data: K) => {
            const res = Promise.resolve(listener(data));
            res.then((d) => {
                return d;
            }).catch((err) => {
                if (errorHandler) {
                    errorHandler(err);
                } else {
                    Logger.error("typedOn got error", err);
                }
            });
        });
    }
}

export class TypedEmitter<O extends MessageEvent, I extends MessageEvent> extends BaseTypedEmitter<O, I> {}
