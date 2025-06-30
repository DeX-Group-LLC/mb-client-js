import { Message as MessageType, BrokerHeader, ClientHeader, Payload, PayloadSuccess } from "../types";
import { Client, PublishOptions, RequestOptions } from "./client";

export class Message<T extends BrokerHeader | ClientHeader, U extends Payload = Payload> {
    constructor(private client: Client, public header: T, public payload: U) {
    }

    async publish(topic: string, payload: PayloadSuccess, options?: Omit<PublishOptions, 'parentRequestId'>): Promise<void> {
        await this.client.publish(topic, payload, { ...options, parentRequestId: this.header.requestId });
    }

    async request(topic: string, payload: PayloadSuccess, options?: Omit<RequestOptions, 'parentRequestId'>): Promise<Message<BrokerHeader, Payload>> {
        return await this.client.request(topic, payload, { ...options, parentRequestId: this.header.requestId });
    }

    async response(payload: Payload): Promise<void> {
        await this.client.response(this, payload);
    }
}