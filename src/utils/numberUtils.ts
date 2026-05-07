export const toLatinDigits = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const find = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩','۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const replace = ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'];
  let result = str;
  for (let i = 0; i < find.length; i++) {
    result = result.split(find[i]).join(replace[i]);
  }
  return result;
};
