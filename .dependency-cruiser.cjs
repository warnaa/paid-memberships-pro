/**
 * dependency-cruiser rules for the JavaScript sources in this plugin.
 *
 * Keep the scope explicit: generated bundles and third-party assets are not
 * source modules and should not be part of the dependency graph.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make the bundle order and initialization fragile.",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "Every local and package import must resolve from the project.",
      from: {},
      to: {
        couldNotResolve: true,
        // WordPress packages and jQuery are provided by WordPress/Webpack at runtime.
        pathNot: "^(@wordpress(?:/|$)|jquery$)",
      },
    },
    {
      name: "not-to-test",
      severity: "error",
      comment: "Production code must not depend on test-only modules.",
      from: { pathNot: "(^|/)(test|tests)(/|$)" },
      to: { path: "(^|/)(test|tests)(/|$)" },
    },
    {
      name: "not-to-spec",
      severity: "error",
      comment: "Production code must not depend on test/spec files.",
      from: { pathNot: "(^|/)(test|tests)(/|$)" },
      to: { path: "\\.(spec|test)\\.[cm]?[jt]sx?$" },
    },
  ],
  options: {
    doNotFollow: {
      path: "(^|/)node_modules(/|$)|(^|/)(build|dist)(/|$)",
    },
    exclude: "(^|/)(node_modules|build|dist)(/|$)",
    tsPreCompilationDeps: true,
    preserveSymlinks: false,
    reporterOptions: {
      dot: { collapsePattern: "(^|/)(blocks/src|js)(/|$)" },
    },
  },
};
