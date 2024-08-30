export const getFilters = async () => {
  const filters = await fetch("https://yugireg.onrender.com/filters");
  return filters;
};