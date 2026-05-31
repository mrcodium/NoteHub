import { Liquid } from "liquidjs";

const engine = new Liquid({
  strictFilters: false,
  strictVariables: false,
});

/**
 * Render a liquid template string with given context
 * @param {string} templateStr - raw liquid HTML string
 * @param {object} context - { user, extra }
 * @returns {Promise<string>} rendered HTML
 */
export const renderLiquid = async (templateStr, context) => {
  return await engine.parseAndRender(templateStr, context);
};