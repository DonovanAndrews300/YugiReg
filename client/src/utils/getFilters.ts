export const getFilters = async () => {
  const filters = await fetch("https://yugireg-45086852d588.herokuapp.com/filters");
  return filters;
};