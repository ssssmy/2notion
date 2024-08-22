import Ytool from '../core/app.js';
import { loginYuque, getBookStacks, getDocsOfBooks, getMarkdownContent } from '../lib/yuque.js';
const ytool = new Ytool({
    __isCLI__: false,
});
export { ytool, loginYuque, getBookStacks, getDocsOfBooks, getMarkdownContent };
