export const config = {
    host: process.env.MB_HOST ?? "localhost",
    ports: {
        ws: 8000,
        wss: 3443,
        tcp: 8001,
        tls: 3444,
    },
};