const YUQUE_API = {
    get yuqueReferer() {
        return '/login?goto=https%3A%2F%2Fwww.yuque.com%2Fdashboard';
    },
    get yuqueLoginApi() {
        return '/api/accounts/login';
    },
    get mobileLoginApi() {
        return '/api/mobile_app/accounts/login?language=zh-cn';
    },
    get yuqueBooksList() {
        return '/api/mine/book_stacks';
    },
    get yuqueCollabBooks() {
        return '/api/mine/raw_collab_books';
    },
    get yuqueBooksListOfSpace() {
        return '/api/mine/user_books?user_type=Group';
    },
    yuqueDocsOfBook(bookId) {
        return `/api/docs?book_id=${bookId}`;
    },
    yuqueDocsOfSlugAndBook(slug, bookId) {
        return `/api/docs/${slug}?book_id=${bookId}`;
    },
    yuqueCommentsOfFloor(id) {
        return `/api/comments/floor?commentable_type=Doc&commentable_id=${id}`;
    },
    yuqueBookPasswordVerify(bookId) {
        return `/api/books/${bookId}/verify`;
    },
    yuqueExportMarkdown(repos, linebreak, latexcode) {
        return `${repos}/markdown?attachment=true&latexcode=${latexcode}&anchor=false&linebreak=${linebreak}`;
    },
    yuqueExportNotes(offset, limit) {
        return `/api/modules/note/notes/NoteController/index?offset=${offset}&q=&filter_type=all&status=0&merge_dynamic_data=0&order=content_updated_at&with_pinned_notes=true&limit=${limit}
`;
    },
};
export default YUQUE_API;
