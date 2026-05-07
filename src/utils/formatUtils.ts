/**
 * دالة لتنسيق عدد المشاهدات بشكل مقروء
 * @param views عدد المشاهدات
 * @returns النص المنسق للمشاهدات
 */
export const formatViewCount = (views: number): string => {
  if (views >= 1000000) {
    const millions = Math.floor(views / 1000000);
    const remainder = Math.floor((views % 1000000) / 100000);
    return remainder > 0 ? `${millions}.${remainder} مليون` : `${millions} مليون`;
  } else if (views >= 1000) {
    const thousands = Math.floor(views / 1000);
    const remainder = Math.floor((views % 1000) / 100);
    return remainder > 0 ? `${thousands}.${remainder} ألف` : `${thousands} ألف`;
  }
  return views.toString();
};

/**
 * دالة لتنسيق الأرقام الكبيرة بشكل عام
 * @param number الرقم المراد تنسيقه
 * @returns النص المنسق للرقم
 */
export const formatLargeNumber = (number: number): string => {
  if (number >= 1000000) {
    const millions = Math.floor(number / 1000000);
    const remainder = Math.floor((number % 1000000) / 100000);
    return remainder > 0 ? `${millions}.${remainder} مليون` : `${millions} مليون`;
  } else if (number >= 1000) {
    const thousands = Math.floor(number / 1000);
    const remainder = Math.floor((number % 1000) / 100);
    return remainder > 0 ? `${thousands}.${remainder} ألف` : `${thousands} ألف`;
  }
  return number.toString();
};