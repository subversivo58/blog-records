
/*
  @license The MIT License (MIT)             - [https://github.com/subversivo58/blog-records/blob/main/LICENSE]
  @copyright Copyright (c) 2010-2026 Lauro Moraes - [https://github.com/subversivo58]
*/

import { handleRequest } from "./router/index.mjs";


export default {
    async fetch(request, env, ctx) {
        return handleRequest(request, env, ctx);
    }
};
