/**
 * 网络路由 - 替代原Router
 */
export class NetworkRoutes {
    static readonly LOGIN = 'user/login';
    static readonly LOGOUT = 'user/logout';
    static readonly GET_PROFILE = 'user/profile';
    static readonly UPDATE_SCORE = 'game/score';
    static readonly GET_LEADERBOARD = 'game/leaderboard';
    static readonly SUBMIT_LEVEL_RESULT = 'game/level/result';
    static readonly GET_LEVEL_DATA = 'game/level/data';
}