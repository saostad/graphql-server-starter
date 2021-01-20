import { Directive, Field, ObjectType } from "type-graphql";

@Directive(`@key(fields: "App")`)
@ObjectType()
export class App {
  @Field((type) => String, { nullable: true })
  version: string;
}
