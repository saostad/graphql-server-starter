import path from "path";
import { Resolver, Query, Arg, Ctx } from "type-graphql";
import type { Context } from "../../typings/context";
import { App } from "../types/app";

@Resolver()
export class AppResolver {
  @Query(() => App)
  async app(@Ctx() ctx: Context): Promise<[App]> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require(path.join(process.cwd(), "package.json"));

    return { version } as any;
  }
}
