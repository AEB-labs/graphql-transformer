# NO LONGER MAINTAINED

We no longer use this library at AEB, so unfortunately, we are not able to maintain it properly. The repository is therefore archived.

# graphql-transformer

[![npm version](https://badge.fury.io/js/graphql-transformer.svg)](https://npmjs.org/graphql-transformer) [![Build Status](https://github.com/AEB-labs/graphql-transformer/workflows/Node%20CI/badge.svg
)](https://github.com/AEB-labs/graphql-transformer/actions?workflow=Node+CI)

A tool to transform GraphQL schemas via simple functions

## How to use

```bash
npm install --save graphql-transformer
```

Basic usage:

```typescript
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
```

[This test case](spec/schema-transformer.spec.ts) demonstrates that and how it works.

## Contributing

After cloning the repository, run

```bash
npm install
npm start
```

To run the test suite, run

```bash
npm test
```

To debug the tests in WebStorm, right-click on `graphql-transformer-test.js` and choose *Debug*.

