import { Temporal } from "@js-temporal/polyfill";

//Shared

export interface Category {
    name: string,
    short_name: string,
    slug: string,
    url: string,
    data_url: string,
}

export enum RaceEntryStatus {
    REQUESTED       = "requested",
    INVITED         = "invited",
    DECLINED        = "declined",
    READY           = "ready",
    NOT_READY       = "not_ready",
    IN_PROGRESS     = "in_progress",
    DONE            = "done",
    DID_NOT_FINISH  = "dnf",
    DISQUALIFIED    = "dq"
}

export interface RaceGoal {
    name: string,
    custom: boolean
}

export interface RaceStatus {
    value: RaceStatusText,
    verbose_value: string,
    help_text: string
}

export enum RaceStatusText {
    OPEN = 'open',
    INVITATIONAL = 'invitational',
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    FINISHED = 'finished',
    CANCELLED = 'cancelled'
}

export enum SurveyType {
    INPUT   = "input",
    BOOL    = "bool",
    RADIO   = "radio",
    SELECT  = "select"
}

export enum RTPacketTypes {
    GET_RACE            = "getrace",
    GET_HISTORY         = "gethistory",
    MESSAGE             = "message",
    PIN_MESSAGE         = "pin_message",
    UNPIN_MESSAGE       = "unpin_message",
    PING                = "ping",
    SET_INFO            = "setinfo",
    MAKE_OPEN           = "make_open",
    MAKE_INVITATIONAL   = "make_invitational",
    BEGIN               = "begin",
    CANCEL              = "cancel",
    INVITE              = "invite",
    ACCEPT_REQUEST      = "accept_request",
    FORCE_UNREADY       = "force_unready",
    REMOVE_ENTRANT      = "remove_entrant",
    ADD_MONITOR         = "add_monitor",
    REMOVE_MONITOR      = "remove_monitor",
    OVERRIDE_STREAM     = "override_stream"
}

export enum RTMessageTypes {
    CHAT_HISTORY = "chat.history",
    CHAT_MESSAGE = "chat.message",
    CHAT_DM      = "chat.dm",
    CHAT_PIN     = "chat.pin",
    CHAT_UNPIN   = "chat.pin",
    CHAT_DELETE  = "chat.delete",
    CHAT_PURGE   = "chat.purge",

    ERROR        = "error",
    PONG         = "pong",
    RACE_DATA    = "race.data",
    RACE_RENDERS = "race.renders"
}

//Websocket
export interface RTAction {
    action: RTPacketTypes,
    data?: object
}

export interface RTMessage {
    type: RTMessageTypes,
}

export interface UserData {
    id: string,
    full_name: string,
    name: string,
    discriminator?: string,
    url: string,
    avatar?: string,
    pronouns?: string,
    flair: string,
    twitch_name?: string,
    twitch_channel?: string,
    can_moderate: boolean
}

export interface Action {
    message?: string,
    url?: string,
    help?: string,
    survey?: Survey[],
    submit?: string
}

export interface Survey {
    name: string,
    label: string,
    default?: string,
    help?: string,
    type: SurveyType,
    placeholder?: string,
    options?: object
}

export interface ChatMessage extends RTMessage {
    message: {
        id: string,
        user: UserData,
        bot: string,
        direct_to: UserData,
        posted_at: Date,
        message: string,
        message_plain: string,
        highlight: boolean,
        is_dm: boolean,
        is_bot: boolean,
        is_system: boolean,
        is_pinned: boolean,
        delay: typeof Temporal,
        actions: Action[]
    }
}

export interface DeletedMessage extends RTMessage {
    delete: {
        id: string,
        user: UserData,
        bot: string,
        is_bot: boolean,
        deleted_by: UserData
    }
}

export interface PurgeUser extends RTMessage {
    purge: {
        user: UserData,
        purged_by: UserData
    }
}

export interface RacetimeError extends RTMessage {
    errors: string[]
}

export interface ChatHistoryMessage extends RTMessage {
    messages: ChatMessage[]
}

export interface RaceData extends RTMessage {
    race: RaceDetails
}

export interface CachableData {
    last_updated: Date,
}

export interface RaceDetails extends CachableData {
    version: number,
    name: string,
    category: Category,
    status: RaceStatus,
    url: string,
    data_url: string,
    websocket_url: string,
    websocket_bot_url: string,
    websocket_oauth_url: string,
    goal: RaceGoal,
    info: string,
    info_bot: string,
    info_user: string,
    entrants_count: number,
    entrants_count_finished: number,
    entrants_count_inactive: number,
    entrants: RaceEntrants[],
    opened_at: Date,
    start_delay: typeof Temporal,
    started_at?: Date,
    ended_at?: Date,
    cancelled_at?: Date,
    unlisted: boolean,
    time_limit: typeof Temporal,
    time_limit_auto_complete: boolean,
    streaming_required: boolean,
    auto_start: boolean,
    opened_by: UserData,
    monitors: UserData[],
    recordable: boolean,
    recorded: boolean,
    recorded_by: UserData,
    allow_comments: boolean,
    hide_comments: boolean,
    allow_midrace_chat: boolean,
    allow_non_entrant_chat: boolean,
    chat_message_delay: typeof Temporal
}

export interface RaceEntrants extends CachableData {
    user: UserData,
    status: RaceEntrantStatus,
    finish_time?: typeof Temporal,
    finished_at?: typeof Temporal,
    place: number,
    place_ordinal: string,
    score: number,
    score_change: number,
    comment?: string,
    has_comment: boolean,
    stream_live: boolean,
    stream_override: boolean
}

export interface RaceEntrantStatus extends CachableData {
    value: RaceEntryStatus,
    verbose_value: string,
    help_text: string
}

//HTTP
export interface CategoryDetail extends CachableData {
    name: string,
    short_name: string,
    slug: string,
    url: string,
    data_url: string,
    image?: string,
    info: string,
    streaming_required: boolean,
    owners: UserData[],
    moderators: UserData[],
    goal: string[],
    current_races: RaceData[],
    emotes: object
}

export interface CreateRaceData extends Iterable<[string, string]> {
    goal?: string,
    custom_goal?: string,
    team_race?: boolean,
    invitational?: boolean,
    unlisted?: boolean,
    info_user?: string,
    info_bot?: string,
    require_even_teams?: boolean,
    start_delay: number,
    time_limit: number,
    time_limit_auto_complete?: boolean,
    streaming_required?: boolean,
    auto_start?: boolean,
    allow_comments?: boolean,
    hide_comments?: boolean,
    allow_prerace_chat?: boolean,
    allow_midrace_chat?: boolean,
    allow_non_entrant_chat?: boolean,
    chat_message_delay: number
}