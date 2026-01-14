import {FSWatcher} from 'fs';
import {EventEmitter} from 'events';

/**
 * Watch for changes on files or directories.
 *
 * @param pathName - File or directory to watch. Can be a single path or array of paths.
 * @param options - Watch options or encoding string.
 * @param callback - Callback function invoked on changes.
 * @returns A Watcher object that can be used to manage the watch.
 *
 * @example
 * ```js
 * import watch from 'node-watch';
 *
 * // Watch a directory recursively
 * const watcher = watch('./src', { recursive: true }, (evt, name) => {
 *   console.log('%s changed.', name);
 * });
 *
 * // Close the watcher when done
 * watcher.close();
 * ```
 */
declare function watch(pathName: PathName): Watcher;
declare function watch(pathName: PathName,options: Options): Watcher;
declare function watch(pathName: PathName,callback: Callback): Watcher;
declare function watch(pathName: PathName,options: Options,callback: Callback): Watcher;

/**
 * Event type emitted by the watcher.
 * - `update`: File or directory was created or modified.
 * - `remove`: File or directory was deleted.
 */
export type EventType='update'|'remove';

/**
 * Callback function invoked when a file system event occurs.
 * @param eventType - The type of event (update or remove).
 * @param filePath - The path of the file or directory that changed.
 */
export type Callback=(eventType: EventType,filePath: string) => void;

/**
 * Path name to watch. Can be a single path or an array of paths.
 */
export type PathName=string|readonly string[];

/**
 * Return value from a filter function.
 * - `true`: Include the file/directory.
 * - `false`: Exclude the file/directory.
 * - `skip` symbol: Exclude and don't recurse into subdirectories.
 */
export type FilterReturn=boolean|symbol;

/**
 * Filter function for selectively watching files and directories.
 * @param file - The file or directory path being considered.
 * @param skip - A symbol that can be returned to skip a directory and its subdirectories.
 * @returns Whether to include the file/directory, or the skip symbol.
 */
export type FilterFunction=(file: string,skip: symbol) => FilterReturn;

/**
 * Options for configuring the watcher.
 */
export interface Options {
  /**
   * Indicates whether the process should continue to run
   * as long as files are being watched.
   * @default true
   */
  persistent?: boolean;

  /**
   * Indicates whether all subdirectories should be watched.
   * @default false
   */
  recursive?: boolean;

  /**
   * Specifies the character encoding to be used for the filename
   * passed to the listener. Use 'buffer' to receive Buffer objects.
   * @default 'utf8'
   */
  encoding?: BufferEncoding|'buffer';

  /**
   * Only files which pass this filter will trigger events.
   * Can be a RegExp or a function.
   *
   * @example
   * ```js
   * // Filter with RegExp
   * watch('./', { filter: /\.js$/ });
   *
   * // Filter with function
   * watch('./', {
   *   filter: (f, skip) => {
   *     if (/node_modules/.test(f)) return skip;
   *     return /\.js$/.test(f);
   *   }
   * });
   * ```
   */
  filter?: RegExp|FilterFunction;

  /**
   * Delay in milliseconds before triggering the callback.
   * Events that occur within this window are deduplicated.
   * @default 200
   */
  delay?: number;
}

/**
 * Extended FSWatcher interface with additional methods.
 */
export interface Watcher extends Pick<EventEmitter,'on'|'once'|'emit'|'listeners'|'setMaxListeners'|'getMaxListeners'> {
  /**
   * Returns `true` if the watcher has been closed.
   */
  isClosed(): boolean;

  /**
   * Close the watcher and stop watching for changes.
   */
  close(): void;

  /**
   * Get all watched paths asynchronously.
   * @param callback - Function called with array of watched paths.
   */
  getWatchedPaths(callback: (paths: string[]) => void): void;

  /**
   * Listen for change events.
   */
  on(event: 'change',listener: Callback): this;

  /**
   * Listen for error events.
   */
  on(event: 'error',listener: (error: Error) => void): this;

  /**
   * Listen for when the watcher is ready.
   */
  on(event: 'ready',listener: () => void): this;

  /**
   * Listen for when the watcher is closed.
   */
  on(event: 'close',listener: () => void): this;

  /**
   * Listen once for change events.
   */
  once(event: 'change',listener: Callback): this;

  /**
   * Listen once for error events.
   */
  once(event: 'error',listener: (error: Error) => void): this;

  /**
   * Listen once for when the watcher is ready.
   */
  once(event: 'ready',listener: () => void): this;

  /**
   * Listen once for when the watcher is closed.
   */
  once(event: 'close',listener: () => void): this;
}

export {watch};
export default watch;
