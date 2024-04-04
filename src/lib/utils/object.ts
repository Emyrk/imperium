// setDeep will set they keyString path separated by '.' in the object to the value.
export function setDeep(object: any, keyString: string, value: any): void {
  const keys = keyString.split(".");
  return _setDeep(object, keys, value);
}

function _setDeep(object: any, keys: string[], value: any): void {
  const key = _.first(keys);
  keys = _.drop(keys);
  if (keys.length == 0) {
    // at the end of the recursion
    object[key] = value;
    return;
  } else {
    if (!object[key]) {
      object[key] = {};
    }
    return _setDeep(object[key], keys, value);
  }
}
