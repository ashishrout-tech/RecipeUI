import { RecipeParam, RecipeParamType } from "../types/recipes";

export function isArrayPath(str: string): boolean {
  // Check to see if string in format of [number]
  const re = /^\[\d+\]$/;
  return re.test(str);
}
export function getArrayPathIndex(str: string): number {
  return parseInt(str.slice(1, -1), 10);
}

export function getValueInObjPath<T = unknown>(
  obj: Record<string, unknown>,
  path: string
): T | undefined {
  const keys = path.split(".").slice(1); // Removes the empty string before the first '.'
  let value: unknown | Record<string, unknown> = obj;

  for (const key of keys) {
    if (isArrayPath(key)) {
      value = (value as unknown[])[getArrayPathIndex(key)];
      continue;
    }

    if (!(value as Record<string, unknown>)[key] === undefined) {
      return undefined;
    }

    value = (value as Record<string, unknown>)[key];
  }

  return value as T;
}

export function getDefaultValue<T>(
  param: RecipeParam,
  checkRequired = false
): T | null | undefined {
  if (param["default"] !== undefined) {
    return param.default as T;
  } else if (checkRequired && !param.required) {
    return undefined;
  } else if (param.type === RecipeParamType.String) {
    if (param.enum && param.enum.length > 0) {
      return param.enum[0] as T;
    }

    return "" as T;
  } else if (param.type === RecipeParamType.Number) {
    return (param["minimum"] || param["maximum"] || 0) as T;
  } else if (param.type === RecipeParamType.Boolean) {
    return false as T;
  } else if (param.type === RecipeParamType.File) {
    return null as T;
  } else if (param.type === RecipeParamType.Array) {
    return [getDefaultValue(param.arraySchema)] as T;
  } else if (param.type === RecipeParamType.Object) {
    const obj = {} as T;
    for (const key in param.objectSchema) {
      const value = getDefaultValue(param.objectSchema[key], true);
      if (value !== undefined) {
        // @ts-expect-error TODO: Fix this
        obj[key] = value;
      }
    }
    return obj as T;
  } else if (
    // TODO: AllOf is wrong here in some cases
    "variants" in param
  ) {
    // Check to see if we can find an enum or default value in one of these
    const hasEnumVariant = param.variants.find((variant) => "enum" in variant);
    if (hasEnumVariant) {
      return getDefaultValue(hasEnumVariant);
    }

    const hasVariantWithDefault = param.variants.find(
      (variant) => variant.default != undefined
    );
    if (hasVariantWithDefault) {
      return getDefaultValue(hasVariantWithDefault);
    }

    return getDefaultValue(param.variants[0]);
  }

  return null;
}
