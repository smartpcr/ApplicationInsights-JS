function ModuleLoader(config) {

    if (config) {
        require.config(config);
    }

    var requiredModules = [];

    function processModules() {
        if (requiredModules.length > 0) {
            var module = requiredModules.shift();
            if (module.prepare) {
                module.prepare();
            }

            if (module.config) {
                require.config(config);
            }

            require([module.path], function (theModule) {
                if (module.run) {
                    module.run(theModule);
                } else {
                    console && console.log("Loaded module - " + module.name + " from " + module.path);
                    define(module.name, function() { 
                        if (module.asDefault) {
                            console && console.log("Returning default module - " + module.name);
                            return {
                                "default": theModule
                            }
                        }
                        console && console.log("Returning module - " + module.name);
                        return theModule 
                    });
                }

                processModules();
            },
            function (err) {
                console && console.log("Failed to load [" + module.name + "] from [" + module.path + "]\n - Require ERROR: " + err.toString());
                if (module.path.toLowercase() !== module.path) {
                    console && console.log(" ** Validate the path it may need to be all lowercase -- " + module.path);
                }
            });
        }
    }

    function addModule(name, path, asDefault) {
        var moduleDef = {
            name: name,
            path: !path ? name : path,
            asDefault: asDefault
        }

        requiredModules.push(moduleDef);

        return moduleDef;
    }

    return {
        add: addModule,
        run: processModules
    }
}