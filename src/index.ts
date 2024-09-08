import { TypedEmitter } from "tiny-typed-emitter";
import WebSocketClient from "./websocket/client";
import { CreateRaceData, RaceDetails, RaceData, CategoryDetail, RTPacketTypes, RaceStatus, RaceStatusText } from "./types";

type Credentials = {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string
}

export interface RacetimeEvents {
    'auth success': () => void;
    'auth error': (err) => void;
}

export default class RacetimeClient extends TypedEmitter<RacetimeEvents> {
    clientId: string;
    clientSecret: string;
    auth: Credentials;
    authExpireTime: Date;

    sockets: Map<string, WebSocketClient>;
    category: string;

    raceDetailsCache: Map<string, RaceDetails>;


    /** 
     * @param clientId The Id of your Racetime bot
     * @param clientSecret Your bot's secret token
     * @param category The category slug we are working with for this instance
    **/
    constructor(clientId: string, clientSecret: string, category: string) {
        super();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.category = category

        this.authExpireTime = new Date();
        this.authExpireTime.setFullYear(2000);  //Invalid Date to force reauth
        this.raceDetailsCache = new Map();
        this.sockets = new Map();
        this.authorize().then((authorized) => {
            console.trace(`Authorized: ${authorized}`);
        }).catch((err) => {
            console.error('Failed to auth:', err);
        });
    }

    async joinRaceRoom(roomUrl: string): Promise<boolean> {
        if(!this.sockets.has(roomUrl)) {
            if(this.authExpireTime.getTime() <= new Date().getTime()) {
                if(!await this.authorize()) {
                    throw new Error(`Unable to refresh access_token!`);
                }
            }
            const socket = new WebSocketClient(this, roomUrl);
            this.sockets.set(roomUrl, socket);
            return new Promise((resolve, reject) => {
                socket.on('ready', () => {
                    resolve(true);
                });
                socket.on('socket error', (err) => {
                    reject(err);
                });
                socket.on('close', (code, reason) => {
                    if(code > 1000) {
                        // Abnormal close reason
                        console.warn(`Abnormal disconnection reason: ${code} ${reason}, reconnecting...`);
                        socket.reconnect();
                    }
                });
            });
        } else {
            return true;
        }
    }
    
    /** 
     * @description Attempts to create a new race in the assigned category. Optionally connects to the room's websocket
    **/
    async createRace(raceData: CreateRaceData, connectToRoom: boolean): Promise<RaceDetails> {
        const race = await this.authenticatedFetch(`https://racetime.gg/o/${this.category}/startrace`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams(raceData)
        });

        if(race.status == 201) {
            const raceUrl = race.headers.get("Location");
            const raceData = await this.fetchRaceData(raceUrl);
            if(connectToRoom)
                await this.joinRaceRoom(raceData.websocket_bot_url);
            return raceData;
        } else {
            throw new Error(`Unable to create race: ${await race.text()}`);
        }
    }

    async cancelRace(raceUrl: string): Promise<boolean> {
        const raceData = await this.fetchRaceData(raceUrl);
        await this.joinRaceRoom(raceData.websocket_bot_url);
        this.sockets.get(raceData.websocket_bot_url).sendMessage({
            action: RTPacketTypes.CANCEL
        });
        const newData = await this.fetchRaceData(raceUrl);
        if(newData.status.value == RaceStatusText.CANCELLED) {
            return true;
        }
        return false;
    }

    /**
     * @description Fetches race data for the supplied URL
    **/
    async fetchRaceData(raceUrl: string): Promise<RaceDetails> {
        if(this.raceDetailsCache.has(raceUrl)) {
            const raceDetails = this.raceDetailsCache.get(raceUrl);
            if(raceDetails.last_updated.getTime() + 1000 * 30 > new Date().getTime()) {
                //30 seconds cache
                return raceDetails;
            }
        }
        const raceData = await this.authenticatedFetch(`https://racetime.gg${raceUrl}/data`);
        if(raceData.ok) {
            try {
                const raceDetails = await raceData.clone().json() as RaceDetails;
                raceDetails.last_updated = new Date();
                this.raceDetailsCache.set(raceUrl, raceDetails);
                return raceDetails;
            } catch(e) {
                console.error(e);
                try {
                    console.trace(await raceData.clone().text());
                } catch(e2) {
                    console.error(e2);
                }
                return null;
            }
        } else {
            return null;
        }
    }

    /** 
     * @description Returns all current races from the category
    **/
    async fetchRaces(): Promise<RaceData[]> {
        const races = await this.authenticatedFetch(`https://racetime.gg/${this.category}/data`);

        if(races.ok) {
            const categoryDetail = await races.json() as CategoryDetail;
            return categoryDetail.current_races;
        }
    }

    /**
     * @description Sends a message to the raceroom
     * @param raceUrl Plain URL of the raceroom, excluding 'https://racetime.gg'
     * @param message The message to send
     * @param pin Whether or not to pin the message
     */
    async sendMessage(raceUrl: string, message: string, pin: boolean = false): Promise<void> {
        const raceData = await this.fetchRaceData(raceUrl);
        await this.joinRaceRoom(raceData.websocket_bot_url);
        const socket = this.sockets.get(raceData.websocket_bot_url);
        socket.sendMessage({
            action: RTPacketTypes.MESSAGE,
            data: {message: message, pinned: pin, guid: Math.round(Math.random() * 10000) + ""},
        });
    }
    
    /**
     * @description Attempts to login to RTGG using the supplied Client Id and Secret. Will store authorization
    **/
    private async authorize(): Promise<boolean> {
        const client_authorization = await fetch("https://racetime.gg/o/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({client_id: this.clientId, client_secret: this.clientSecret, grant_type: 'client_credentials'})
        });

        if(client_authorization.ok) {
            this.auth = await client_authorization.json() as Credentials;
            this.authExpireTime = new Date();
            this.authExpireTime.setTime(this.authExpireTime.getTime() + (this.auth.expires_in * 1000));
            return true;
        } else {
            this.emit('auth error', client_authorization.statusText);
            return false;
        }
    }

    private async authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
        if(this.authExpireTime.getTime() <= new Date().getTime()) {
            if(!await this.authorize()) {
                throw new Error(`Unable to refresh access_token!`);
            }
        }
        if(!init) init = {headers: {}};
        init.headers["Authorization"] = `Bearer ${this.auth.access_token}`;
        return await fetch(url, init);
    }
}
