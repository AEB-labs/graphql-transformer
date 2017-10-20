import { GraphQLID, GraphQLInterfaceType, GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { transformSchema } from '../src/schema-transformer';
import { removeUnusedTypesFromSchema } from '../src/remove-unused-types';

describe('remove-unused-types', () => {
    it('removes unused types', () => {
        const iface = new GraphQLInterfaceType({
            name: 'Interface',
            fields: {
                test: {
                    type: GraphQLID
                }
            },
            resolveType: () => ''
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    hello: {
                        type: GraphQLString
                    }
                }
            }),
            types: [new GraphQLObjectType({
                name: 'Unused',
                interfaces: [ iface ],
                fields: {
                    test: {
                        type: GraphQLID
                    }
                }
            })]
        });

        expect(schema.getTypeMap()['Unused']).toBeDefined(); // sanity check that GraphQL does not remove this
        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Unused']).toBeUndefined();
    });

    it('keeps interface implementations if they are still in use', () => {
        const iface = new GraphQLInterfaceType({
            name: 'Interface',
            fields: {
                test: {
                    type: GraphQLID
                }
            },
            resolveType: () => ''
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    hello: {
                        type: iface
                    }
                }
            }),
            types: [new GraphQLObjectType({
                name: 'Impl',
                interfaces: [ iface ],
                fields: {
                    test: {
                        type: GraphQLID
                    }
                }
            })]
        });

        expect(schema.getTypeMap()['Impl']).toBeDefined(); // sanity check that GraphQL does not remove this
        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still used indirectly', () => {
        const iface = new GraphQLInterfaceType({
            name: 'Interface',
            fields: {
                test: {
                    type: GraphQLID
                }
            },
            resolveType: () => ''
        });
        const iface2 = new GraphQLInterfaceType({
            name: 'Interface2',
            fields: {
                test: {
                    type: iface
                }
            },
            resolveType: () => ''
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    hello: {
                        type: iface2
                    }
                }
            }),
            types: [new GraphQLObjectType({
                name: 'Impl',
                interfaces: [ iface ],
                fields: {
                    test: {
                        type: GraphQLID
                    }
                }
            })]
        });

        expect(schema.getTypeMap()['Impl']).toBeDefined(); // sanity check that GraphQL does not remove this
        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl']).toBeDefined();
    });

    it('keeps interface implementations if they are still used indirectly through impl fields', () => {
        const iface = new GraphQLInterfaceType({
            name: 'Interface',
            fields: {
                test: {
                    type: GraphQLID
                }
            },
            resolveType: () => ''
        });
        const iface2 = new GraphQLInterfaceType({
            name: 'Interface2',
            fields: {
                test: {
                    type: GraphQLID
                }
            },
            resolveType: () => ''
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    hello: {
                        type: iface2
                    }
                }
            }),
            types: [new GraphQLObjectType({
                name: 'Impl',
                interfaces: [ iface ],
                fields: {
                    test: {
                        type: GraphQLID
                    },
                    otherFields: {
                        type: iface2
                    }
                }
            }), new GraphQLObjectType({
                name: 'Impl2',
                interfaces: [ iface2 ],
                fields: {
                    test: {
                        type: GraphQLID
                    }
                }
            })]
        });

        expect(schema.getTypeMap()['Impl2']).toBeDefined(); // sanity check that GraphQL does not remove this
        const condensedSchema = removeUnusedTypesFromSchema(schema);
        expect(condensedSchema.getTypeMap()['Impl2']).toBeDefined();
    });
});
