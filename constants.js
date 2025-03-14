export const TABLE_CONS = {
    tableWidth: 20,
    tableHeight: 30,
    tableDepth: 1,
    wallWidth: 1,
    wallHeight: 30,
    wallDepth: 2,
    topWallWidth: 20,
    topWallHeight: 1,
    topWallDepth: 2,
    cornerWidth: 1,
    cornerHeight: 1,
    cornerDepth: 2
};

export const FLIPPER_CONS = {
    width: 5,
    height: 1,
    depth: 1,
    color: 0xff0000,
    init_angle: Math.PI / 6,
    max_angle: 0,
    speed: Math.PI*3/2,
    return_speed: Math.PI *4/3,
};

export const BUMPER_CONS = {
    radius: 1,
    height: 1,
    color: 0x0000ff,
};

export const SPEED_BUMPER_CONS = {
    width: 4.5,
    height: 1.5,
    depth: 1,
    color: 0xffff20,
    init_angle: Math.PI / 9,
    acceleration: 1000, // 3m/s^2
};

export const BALL_CONS = {
    radius: 0.5,
    segments: 32,
    color: 0xffffff,
    init_x: 9.4, 
    init_y: -10.0,
    init_z: 1.0
};

export const PLAY_FIELD_CONS = {
    tilt_angle: Math.PI / 6,
};

export const META = {
    bounce_factor: 0.9,
    gravity: -9.8,
};

export const LAUNCHER_CONS = {
    stick_length: 10.0,
    stick_upper_radius: 0.05,
    stick_lower_radius: 0.1,
    init_y: BALL_CONS.init_y - 5 - BALL_CONS.radius/2,
    stick_lowest: BALL_CONS.init_y - 5 - BALL_CONS.radius/2 - 4,
    holding_speed: 2.0,
    releasing_speed: 20,
    barrier_width: 0.5,
    barrier_height: 10.4,
    barrier_depth: 1,
    max_power: 50 
};

export const BOTTOM_BARRIER = {

};

export const VISUALIZE_BOUNDING_BOX = true;