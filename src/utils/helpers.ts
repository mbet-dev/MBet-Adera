// Basic tracking code generator
export const generateTrackingCode = (): string => {
  const prefix = 'MBET';
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
};
