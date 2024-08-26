const argv = () => {
    {
        if (process.argv.length >= 2) {
            const [, , commandInput, ...args] = process.argv;
            return {
                commandInput,
                args,
            };
        }
        return {
            command: '',
            args: [],
        };
    }
};
export { argv };
