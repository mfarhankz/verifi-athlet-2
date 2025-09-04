for name, group in grouped:
    cleaned_group = group.drop(columns=['hs_id'])
    highschool_dfs[name] = cleaned_group
    highschool_dfs_list.append(cleaned_group) 