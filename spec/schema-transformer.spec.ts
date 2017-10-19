import {
    GraphQLFieldConfigMap, GraphQLID, GraphQLInt, GraphQLInterfaceType, GraphQLObjectType, GraphQLObjectTypeConfig,
    GraphQLSchema,
    GraphQLString,
    GraphQLUnionType
} from 'graphql';
import {
    FieldsTransformationContext, GraphQLNamedFieldConfig, transformSchema
} from '../src/schema-transformer';
import { walkFields } from '../src/schema-utils';

describe('schema-transformer', () => {
    it('can copy types', () => {
        const type1 = new GraphQLObjectType({
            name: 'Type1',
            fields: {
                scalar: {
                    type: GraphQLString
                }
            }
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    field1: {
                        type: type1
                    }
                }
            })
        });

        const newSchema = transformSchema(schema, {
            transformFields(config: GraphQLFieldConfigMap<any, any>, context: FieldsTransformationContext) {
                if (context.oldOuterType.name == 'Query') {
                    const field1 = config['field1'];

                    const type2 = context.copyType(field1.type, {
                        transformObjectType(typeConfig: GraphQLObjectTypeConfig<any, any>) {
                            return {
                                ...typeConfig,
                                name: 'Type2'
                            };
                        },

                        transformFields(fieldConfig: GraphQLFieldConfigMap<any, any>) {
                            return {
                                ...fieldConfig,
                                clone: {
                                    type: GraphQLInt,
                                    resolve: () => 42
                                }
                            };
                        }
                    });

                    return {
                        ...config,
                        field2: {
                            type: type2
                        }
                    };
                }

                return config;
            }
        });

        expect(walkFields(newSchema.getQueryType(), ['field1', 'scalar'])).toBeDefined('type1.scalar is missing');
        expect(walkFields(newSchema.getQueryType(), ['field2', 'scalar'])).toBeDefined('type2.scalar is missing');
        expect(walkFields(newSchema.getQueryType(), ['field1', 'clone'])).toBeUndefined('type2.clone should not be there');
        expect(walkFields(newSchema.getQueryType(), ['field2', 'clone'])).toBeDefined('type2.clone is missing');
    });

    it('supports union types', () => {
        const option1 = new GraphQLObjectType({
            name: 'Option1',
            fields: {option1: {type: GraphQLInt}},
            isTypeOf: (obj) => { return 'option1' in obj; }
        });
        const option2 = new GraphQLObjectType({
            name: 'Option2',
            fields: {option2: {type: GraphQLInt}},
            isTypeOf: (obj) => { return 'option1' in obj; }
        });

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    union: {
                        type: new GraphQLUnionType({
                            name: 'Union',
                            types: [ option1, option2 ]
                        })
                    }
                }
            })
        });

        const newSchema = transformSchema(schema, {
            transformField(config: GraphQLNamedFieldConfig<any, any>) {
                return {
                    ...config,
                    name: config.name + '_'
                };
            }
        });
        const unionType = newSchema.getQueryType().getFields()['union_'].type;
        expect(unionType instanceof GraphQLUnionType).toBeTruthy();
        expect((unionType as GraphQLUnionType).getTypes().length).toBe(2);
    });

    it('supports the README case', () => {
        const myType = new GraphQLObjectType({
            name: 'MyType',
            fields: {
                name: {
                    type: GraphQLString
                }
            }
        });

        const originalSchema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields: {
                    myField: {
                        type: myType
                    }
                }
            })
        });

        const transformedSchema = transformSchema(originalSchema, {
            transformField(field: GraphQLNamedFieldConfig<any, any>, context) {
                // Rename a field in a type
                if (context.oldOuterType.name == 'MyType') {
                    return {
                        ...field,
                        name: field.name + 'ButCooler'
                    }
                }
                return field;
            },

            transformObjectType(type: GraphQLObjectTypeConfig<any, any>) {
                if (type.name == 'MyType') {
                    return {
                        ...type,
                        name: 'MyCoolType'
                    };
                }
                return type;
            },

            transformFields(fields: GraphQLFieldConfigMap<any, any>, context) {
                // You can even copy types on the fly and transform the copies
                const type2 = context.copyType(context.oldOuterType, {
                    transformObjectType(typeConfig: GraphQLObjectTypeConfig<any, any>) {
                        return {
                            ...typeConfig,
                            name: typeConfig.name + '2'
                        };
                    }
                });

                // This just adds a reflexive field "self" to all types, but its type does not have
                // the "self" field (because it is a copy from the original type, see above)
                // it also won't have the "cool" rename applied because the top-level transformers are not applied
                return {
                    ...fields,
                    self: {
                        type: type2,
                        resolve: (source: any) => source
                    }
                }
            }
        });

        const myTypeRes = transformedSchema.getQueryType().getFields()['myField'].type as GraphQLObjectType;
        expect(myTypeRes).toBeDefined();
        expect(myTypeRes.getFields()['nameButCooler']).toBeDefined();
        expect(myTypeRes.getFields()['self']).toBeDefined();
        const reflexiveTypeRes = myTypeRes.getFields()['self'].type as GraphQLObjectType;
        expect(reflexiveTypeRes.name).toBe('MyType2');
        expect(reflexiveTypeRes.getFields()['self']).not.toBeDefined();
        expect(reflexiveTypeRes.getFields()['name']).toBeDefined();
    });

    it('removes unused types', () => {
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
                fields: {
                    test: {
                        type: GraphQLID
                    }
                }
            })]
        });

        expect(schema.getTypeMap()['Unused']).toBeDefined(); // sanity check that GraphQL does not remove this
        const transformedSchema = transformSchema(schema, {})
        expect(transformedSchema.getTypeMap()['Unused']).toBeUndefined();
    });

    it('removes type that were used and now are unused', () => {
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
        // now remove the only reference to the interface
        const transformedSchema = transformSchema(schema, {
            transformField(config) {
                if (config.name == 'hello') {
                    return {
                        ...config,
                        type: GraphQLString
                    }
                }
                return config;
            }
        });
        expect(transformedSchema.getTypeMap()['Unused']).toBeUndefined();
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
                    },
                    hello2: {
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
        // now remove the only reference to the interface
        const transformedSchema = transformSchema(schema, {
            transformField(config) {
                if (config.name == 'hello') {
                    return {
                        ...config,
                        type: GraphQLString
                    }
                }
                return config;
            }
        });
        expect(transformedSchema.getTypeMap()['Impl']).toBeDefined();
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
                    },
                    hello2: {
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
        // now remove the only reference to the interface
        const transformedSchema = transformSchema(schema, {
            transformField(config) {
                if (config.name == 'hello') {
                    return {
                        ...config,
                        type: GraphQLString
                    }
                }
                return config;
            }
        });
        expect(transformedSchema.getTypeMap()['Impl']).toBeDefined();
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
                        type: iface
                    },
                    hello2: {
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
        // now remove the only reference to the interface
        const transformedSchema = transformSchema(schema, {
            transformField(config) {
                if (config.name == 'hello') {
                    return {
                        ...config,
                        type: GraphQLString
                    }
                }
                return config;
            }
        });
        expect(transformedSchema.getTypeMap()['Impl2']).toBeDefined();
    });
});
