export const fixMojibake = (value?: string) => {
  if (!value || !/[ÃƒÃ‚]/.test(value)) return value || '';
  try {
    return decodeURIComponent(escape(value));
  } catch (error) {
    return value;
  }
};
