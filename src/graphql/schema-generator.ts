import {
  buildSchema,
  BuildSchemaOptions,
  createResolversMap,
} from "type-graphql";
import path from "path";
import { specifiedDirectives } from "graphql";
import federationDirectives from "@apollo/federation/dist/directives";
import gql from "graphql-tag";
import {
  printSchema,
  buildFederatedSchema as buildApolloFederationSchema,
} from "@apollo/federation";
import { addResolversToSchema, GraphQLResolverMap } from "apollo-graphql";
import { AppResolver } from "./resolvers/app-resolver";

type SchemaGeneratorInput = {
  federated: boolean;
  referenceResolvers?: GraphQLResolverMap<any>;
};
export async function schemaGenerator({
  federated,
  referenceResolvers,
}: SchemaGeneratorInput) {
  const options: Omit<BuildSchemaOptions, "skipCheck"> = {
    resolvers: [AppResolver],

    // automatically create `.gql` file with schema definition in current folder
    emitSchemaFile: path.resolve(process.cwd(), "generated", "gql-schema.gql"),
  };

  if (federated) {
    const schema = await buildSchema({
      ...options,
      directives: [
        ...specifiedDirectives,
        ...federationDirectives,
        ...(options?.directives || []),
      ],
      skipCheck: true,
    });

    const federatedSchema = buildApolloFederationSchema({
      typeDefs: gql(printSchema(schema)),
      resolvers: createResolversMap(schema) as any,
    });

    if (referenceResolvers) {
      addResolversToSchema(federatedSchema, referenceResolvers);
    }
    return federatedSchema;
  } else {
    const schema = await buildSchema({
      ...options,
    });
    return schema;
  }
}
