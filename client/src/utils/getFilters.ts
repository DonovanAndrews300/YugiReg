export const getFilters = async () => {
  const filters = await fetch("http://localhost:3000/filters");
  return filters;
};