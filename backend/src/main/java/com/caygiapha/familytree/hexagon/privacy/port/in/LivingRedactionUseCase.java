package com.caygiapha.familytree.hexagon.privacy.port.in;

import com.caygiapha.familytree.entity.Person;
import com.caygiapha.familytree.security.AuthContext;
import java.util.UUID;

public interface LivingRedactionUseCase {

    boolean isLiving(Person person);

    String visibleName(Person person, AuthContext viewer, UUID treeOwnerUserId, boolean livingRedactionEnabled);
}
