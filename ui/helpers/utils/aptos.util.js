export function composeType(module, struct, generics = []) {
  let result = `${module}::${struct}`;
  if(!generics || !generics.length) {
    return result
  }

  result += `<${generics.join(',')}>`

  return result
}

export function extractAddressFromType(type) {
  return type.split('::')[0];
}
