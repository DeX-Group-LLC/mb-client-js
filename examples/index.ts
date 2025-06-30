import { runRequester } from "./requester";
import { runResponder } from "./responder";
import { runListener } from "./listener";
import { runSortClient } from "./sort-client";

// Configuration flags to enable/disable different roles
const ENABLE_REQUESTER = true;
const ENABLE_RESPONDER = true;
const ENABLE_LISTENER = true;
const ENABLE_SORT_CLIENT = true;

if (ENABLE_REQUESTER) runRequester();
if (ENABLE_RESPONDER) runResponder();
if (ENABLE_LISTENER) runListener();
if (ENABLE_SORT_CLIENT) runSortClient();