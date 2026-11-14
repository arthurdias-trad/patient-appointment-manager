import { createHibpStub, HIBP_STUB_HOST, HIBP_STUB_PORT } from "./hibp-stub.ts";

createHibpStub().listen(HIBP_STUB_PORT, HIBP_STUB_HOST);
