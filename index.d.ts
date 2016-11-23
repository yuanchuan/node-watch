declare module "node-watch" {
    import fs = require("fs");

    interface WatchOptions{
        recursive?:boolean;
        followSymLinks?:boolean;
        maxSymLevel?:boolean;
        filter?:(path:string)=>boolean;
    }

    function watch(fileDirOrGlob:string, options?:WatchOptions):fs.FSWatcher;
    namespace watch {}
    export = watch;
}
