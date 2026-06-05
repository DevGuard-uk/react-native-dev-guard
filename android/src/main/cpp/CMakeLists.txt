cmake_minimum_required(VERSION 3.18.1)
project("devguard")

add_library(
    devguard
    SHARED
    devguard-lib.cpp
    ../../../../cpp/devguard_core.c
)

target_include_directories(
    devguard
    PRIVATE
    ../../../../cpp
)

find_library(
    log-lib
    log
)

target_link_libraries(
    devguard
    ${log-lib}
)
