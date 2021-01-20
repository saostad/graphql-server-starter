import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
import { createLogger, writeLog } from "fast-node-logger";
import type { NodeMode } from "./typings/node/mode";
import express from "express";
import { ApolloServer, gql } from "apollo-server-express";
import expressPinoLogger from "express-pino-logger";
import { schemaGenerator } from "./graphql/schema-generator";

/** server mode base on process.env.NODE_ENV */
let nodeMode: NodeMode = process.env.NODE_ENV || "production";

if (process.env.NODE_ENV) {
  nodeMode = process.env.NODE_ENV;
}

const serverPort = parseInt(process.env.PORT || "4001");

export async function main() {
  /** ready to use instance of logger */
  const logger = await createLogger({
    level: nodeMode === "development" ? "trace" : "warn",
    prettyPrint: { colorize: true, translateTime: " yyyy-mm-dd HH:MM:ss" },
    logDir: path.join(process.cwd(), "logs"),
  });
  writeLog(`script started in ${nodeMode} mode!`, { stdout: true });

  /** put your code below here */

  // // Construct a schema, using GraphQL schema language
  // const typeDefs = gql`
  //   type Query {
  //     hello: String
  //   }
  // `;

  // // Provide resolver functions for your schema fields
  // const resolvers = {
  //   Query: {
  //     hello: (_: any, {}: any, ctx: any) => {
  //       console.log(`File: index.ts,`, `Line: 41 => `, ctx);

  //       return "Hello world!";
  //     },
  //   },
  // };

  const schema = await schemaGenerator({
    federated: false,
  });

  const server = new ApolloServer({
    // typeDefs,
    // resolvers,
    schema,
    logger,
    context: { a: "a" },
  });

  const app = express();

  app.use(expressPinoLogger({ logger }));

  server.applyMiddleware({ app });

  app.listen({ port: serverPort }, () =>
    writeLog(
      `Server ready at http://localhost:${serverPort}${server.graphqlPath}`,
      { stdout: true, level: "info" },
    ),
  );
}

main().catch((err: Error) => {
  writeLog(err, { level: "error", stdout: true });
});
