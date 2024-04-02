import WebSocket, { RawData } from 'ws';
import RacetimeClient from '../index.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { ChatHistoryMessage, ChatMessage, DeletedMessage, PurgeUser, RacetimeError, RaceData, RTMessage, RTMessageTypes, RTAction } from '../types.js';

interface WebSocketEvents {
    'ready':        (url: string) => void;
    'close':        (code, reason) => void;
    'socket error': (error) => void;
    'raw message':  (data: RawData) => void;

    'chat-history': (history: ChatHistoryMessage) => void;
    'chat-message': (message: ChatMessage) => void;
    //It is not currently possible for bots to see the content of DMs
    'chat-dm':      () => void;
    'chat-pin':     (message: ChatMessage) => void;
    'chat-unpin':   (message: ChatMessage) => void;
    'chat-delete':  (message: DeletedMessage) => void;
    'chat-purge':   (user: PurgeUser) => void;
    'rt error':     (error: RacetimeError) => void;
    'pong':         () => void;
    'race-data':    (data: RaceData) => void;
}

export default class WebSocketClient extends TypedEmitter<WebSocketEvents> {
    socket: WebSocket;
    client: RacetimeClient;
    ready: boolean = false;
    messageQueue: RTAction[] = [];

    constructor(client: RacetimeClient, raceSocketUrl: string) {
        super();
        this.socket = new WebSocket(`wss://racetime.gg${raceSocketUrl}`, {
            headers: {
                "authorization": `Bearer ${client.auth.access_token}`
            }
        });

        this.socket.on("open", () => {
            this.emit("ready", this.socket.url);
            this.ready = true;
            this.messageQueue.forEach((message) => {
                this.socket.send(JSON.stringify(message));
            });
            this.messageQueue = [];
        });

        this.socket.on("message", (data) => {
            this.emit("raw message", data);
            this.handleMessage(data);
        })

        this.socket.on("close", (code, reason) => {
            console.log(`Socket closed with code ${code} and reason ${reason}`);
            this.emit("close", code, reason);
        })

        this.socket.on("error", (err) => {
            console.log(`Socket error ${err.toString()} when connecting to ${raceSocketUrl}`);
            this.emit("socket error", err);
        })
    }

    sendMessage(message: RTAction) {
        //TODO Do I want to use this queue?
        if(!this.ready) {
            this.messageQueue.push(message);
            return;
        } else {
            console.log(`Sending message: ${JSON.stringify(message)}`);
            this.socket.send(JSON.stringify(message));
        }
    }

    handleMessage(data: RawData) {
        const message = JSON.parse(data.toString()) as RTMessage;
        switch(message.type) {
            case RTMessageTypes.CHAT_DELETE:
                this.emit('chat-delete', message as DeletedMessage);
                break;
            case RTMessageTypes.CHAT_DM:
                //This won't get fired, because bots can't receive DMs
                break;
            case RTMessageTypes.CHAT_HISTORY:
                this.emit('chat-history', message as ChatHistoryMessage);
                break;
            case RTMessageTypes.CHAT_MESSAGE:
                this.emit('chat-message', message as ChatMessage);
                break;
            case RTMessageTypes.CHAT_PIN:
                this.emit('chat-pin', message as ChatMessage);
                break;
            case RTMessageTypes.CHAT_UNPIN:
                this.emit('chat-unpin', message as ChatMessage);
                break;
            case RTMessageTypes.CHAT_PURGE:
                this.emit('chat-purge', message as PurgeUser);
                break;
            case RTMessageTypes.ERROR:
                this.emit('rt error', message as RacetimeError);
                console.log(`Error: ${JSON.stringify(message)}`);
                break;
            case RTMessageTypes.PONG:
                break;
            case RTMessageTypes.RACE_DATA:
                this.emit('race-data', message as RaceData);
                break;
            case RTMessageTypes.RACE_RENDERS:
                //Ignore
                break;
            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
    }
}