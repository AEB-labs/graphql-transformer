import {
    GraphQLField, GraphQLFieldMap, GraphQLInterfaceType, GraphQLObjectType, GraphQLType, GraphQLUnionType
} from 'graphql';

/**
 * Orders the given types so that no forward references occur when traversing the type hierarchy
 * Note that only interface implementations and union option types are respected, fields are not included
 */
export function orderTypesTopologically<T extends GraphQLType>(types: T[]): T[] {
    function order(t: GraphQLType) {
        if (t instanceof GraphQLInterfaceType) {
            return 0;
        }
        if (t instanceof GraphQLUnionType) {
            return 2;
        }
        return 1;
    }
    return [...types].sort((a, b) => order(a) - order(b));
}

/**
 * Finds a field by traversing a schema from field to field
 * @param type the type where to start
 * @param fieldNames an array of field names to traverse
 * @return the field, or undefined if not found
 */
export function walkFields(type: GraphQLObjectType|GraphQLInterfaceType, fieldNames: string[]): GraphQLField<any, any>|undefined {
    let field: GraphQLField<any, any>|undefined;
    let currentType: GraphQLType = type;
    for (const fieldName of fieldNames) {
        if (!(currentType instanceof GraphQLObjectType) && !(currentType instanceof GraphQLInterfaceType)) {
            return undefined;
        }

        const fields: GraphQLFieldMap<any, any> = currentType.getFields();
        if (!(fieldName in fields)) {
            return undefined;
        }

        field = fields[fieldName];
        currentType = field.type;
    }
    return field;
}
