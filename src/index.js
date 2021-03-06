/* eslint-env node */
import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { createICSSRules } from "icss-utils";

const plugin = "postcss-plugin-import";

const getArg = nodes =>
  nodes.length !== 0 && nodes[0].type === "string"
    ? nodes[0].value
    : valueParser.stringify(nodes);

const getUrl = node => {
  if (node.type === "function" && node.value === "url") {
    return getArg(node.nodes);
  }
  if (node.type === "string") {
    return node.value;
  }
  return "";
};

const parseImport = params => {
  const { nodes } = valueParser(params);
  if (nodes.length === 0) {
    return null;
  }
  const url = getUrl(nodes[0]);
  if (url.trim().length === 0) {
    return null;
  }
  return {
    url,
    media: valueParser.stringify(nodes.slice(1)).trim()
  };
};

const isExternalUrl = url => /^\w+:\/\//.test(url) || url.startsWith("//");

const walkImports = (css, callback) => {
  css.each(node => {
    if (node.type === "atrule" && node.name.toLowerCase() === "import") {
      callback(node);
    }
  });
};

module.exports = postcss.plugin(plugin, () => (css, result) => {
  const imports = {};
  walkImports(css, atrule => {
    if (atrule.nodes) {
      return result.warn(
        "It looks like you didn't end your @import statement correctly. " +
          "Child nodes are attached to it.",
        { node: atrule }
      );
    }
    const parsed = parseImport(atrule.params);
    if (parsed === null) {
      return result.warn(`Unable to find uri in '${atrule.toString()}'`, {
        node: atrule
      });
    }
    if (!isExternalUrl(parsed.url)) {
      atrule.remove();
      imports[`'${parsed.url}'`] = {
        import: "default" +
          (parsed.media.length === 0 ? "" : ` ${parsed.media}`)
      };
    }
  });
  css.prepend(createICSSRules(imports, {}));
});
