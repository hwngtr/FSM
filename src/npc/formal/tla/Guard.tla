---- MODULE Guard ----
VARIABLES state, last_guard

States == {"idle", "patrol", "investigate", "chase", "attack", "search", "return"}

TypeOK ==
    /\ state \in States

Init ==
    /\ state = "idle"
    /\ last_guard = "init"

Step_0_idle_chase ==
    /\ state = "idle"
    /\ state' = "chase"
    /\ last_guard' = "player_visible"

Step_1_idle_investigate ==
    /\ state = "idle"
    /\ state' = "investigate"
    /\ last_guard' = "heard_sound"

Step_2_idle_patrol ==
    /\ state = "idle"
    /\ state' = "patrol"
    /\ last_guard' = "route_assigned"

Step_3_patrol_chase ==
    /\ state = "patrol"
    /\ state' = "chase"
    /\ last_guard' = "player_visible"

Step_4_patrol_investigate ==
    /\ state = "patrol"
    /\ state' = "investigate"
    /\ last_guard' = "heard_sound"

Step_5_investigate_chase ==
    /\ state = "investigate"
    /\ state' = "chase"
    /\ last_guard' = "player_visible"

Step_6_investigate_search ==
    /\ state = "investigate"
    /\ state' = "search"
    /\ last_guard' = "arrived_and_quiet"

Step_7_chase_attack ==
    /\ state = "chase"
    /\ state' = "attack"
    /\ last_guard' = "in_attack_range"

Step_8_chase_search ==
    /\ state = "chase"
    /\ state' = "search"
    /\ last_guard' = "lost_sight_long"

Step_9_attack_chase ==
    /\ state = "attack"
    /\ state' = "chase"
    /\ last_guard' = "out_of_range"

Step_10_attack_search ==
    /\ state = "attack"
    /\ state' = "search"
    /\ last_guard' = "lost_sight_long"

Step_11_search_chase ==
    /\ state = "search"
    /\ state' = "chase"
    /\ last_guard' = "player_visible"

Step_12_search_investigate ==
    /\ state = "search"
    /\ state' = "investigate"
    /\ last_guard' = "heard_sound"

Step_13_search_return ==
    /\ state = "search"
    /\ state' = "return"
    /\ last_guard' = "search_expired"

Step_14_return_chase ==
    /\ state = "return"
    /\ state' = "chase"
    /\ last_guard' = "player_visible"

Step_15_return_investigate ==
    /\ state = "return"
    /\ state' = "investigate"
    /\ last_guard' = "heard_sound"

Step_16_return_patrol ==
    /\ state = "return"
    /\ state' = "patrol"
    /\ last_guard' = "at_route_start"

Next ==
    Step_0_idle_chase \/ Step_1_idle_investigate \/ Step_2_idle_patrol \/ Step_3_patrol_chase \/ Step_4_patrol_investigate \/ Step_5_investigate_chase \/ Step_6_investigate_search \/ Step_7_chase_attack \/ Step_8_chase_search \/ Step_9_attack_chase \/ Step_10_attack_search \/ Step_11_search_chase \/ Step_12_search_investigate \/ Step_13_search_return \/ Step_14_return_chase \/ Step_15_return_investigate \/ Step_16_return_patrol

Spec == Init /\ [][Next]_<<state, last_guard>>
====
