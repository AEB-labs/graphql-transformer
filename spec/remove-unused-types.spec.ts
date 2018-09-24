import {
    buildASTSchema, GraphQLDirective, GraphQLID, GraphQLInputObjectType, GraphQLObjectType, GraphQLSchema, GraphQLString
} from 'graphql';
import { removeUnusedTypesFromSchema } from '../src/remove-unused-types';
import gql from 'graphql-tag';

describe('remove-unused-types', () => {
    it('removes unused types', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface {
                test: ID
            }
            type Query {
                hello: String
            }
            type Impl implements Interface {
                test: ID
            }
        `);

        expect(schema.getTypeMap()['Impl']).toBeDefined(); // sanity check that GraphQL does not remove this
        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeUndefined();
    });

    it('keeps interface implementations if they are still in use', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface {
                test: ID
            }
            type Query {
                hello: Interface
            }
            type Impl implements Interface {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still in use in list types', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface {
                test: ID
            }
            type Query {
                hello: [Interface]
            }
            type Impl implements Interface {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still in use in non-null types', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface {
                test: ID
            }
            type Query {
                hello: Interface!
            }
            type Impl implements Interface {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still used indirectly', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface {
                test: ID
            }
            interface WrappingInterface {
                test: Interface
            }
            type Query {
                hello: WrappingInterface
            }
            type Impl implements Interface {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still used indirectly through impl fields', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface1 {
                test: ID
            }
            interface Interface2 {
                test: ID
            }
            type Query {
                hello: Interface1
            }
            type Impl1 implements Interface1 {
                test: ID
                otherField: Interface2
            }
            type Impl2 implements Interface2 {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl2']).toBeDefined();
    })

    it('keeps interface implementations if they are still used indirectly through impl fields', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            interface Interface1 {
                test: ID
            }
            interface Interface2 {
                test: ID
            }
            type Query {
                hello: Interface1
            }
            type Impl1 implements Interface1 {
                test: ID
                otherField: Interface2
            }
            type Impl2 implements Interface2 {
                test: ID
            }
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl2']).toBeDefined();
    });

    it('keeps directives and their input types', () => {
        const schema = buildASTSchema(gql`
            schema {
                query: Query
            }
            type Query {
                hello: ID
            }
            input DirInput {
                field: String
            }
            directive @dir(arg: DirInput) on OBJECT
        `);

        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getDirective('dir')).toBeDefined('@dir');
        const type = condensedSchema.getDirective('dir')!.args[0].type;
        expect(type).toBeDefined('@dir.arg[[type]]');
        expect(condensedSchema.getTypeMap()['DirInput']).toBeDefined('DirInput');
    });
});
