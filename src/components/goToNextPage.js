import { showToast } from 'vant' // 或你实际用的 UI 库

export const goToNextPage = (
    index,
    data,
    mode,
    reversd_number = 0,
    none_of_above = 0,
    type = 0,
    is_spell_number = 3,
    device_type = "mobile",
    // ↓ 把所有组件内部响应式变量作为普通值参数传入
    {
        isInChooseMode,      // 传 ref 对象本身，函数内用 .value 赋值
        checkedNoneOfAbove,  // 传 ref 对象本身
        checkedSpell,        // 传 ref 对象本身
        tabsName,            // 传 ref 对象本身
        originalData,        // 传 ref 对象本身
        usercoins,           // 传 ref 对象本身
        lock_spell,          // 传 ref 对象本身
        router,              // 传 router 实例
        getSpellVocabulary,  // 传获取拼写词汇函数
    } = {}
) => {
    if (!router || typeof router.push !== "function") {
        throw new Error("goToNextPage: router 未传入或无效");
    }
    if (typeof getSpellVocabulary !== "function") {
        throw new Error("goToNextPage: getSpellVocabulary 未传入或无效");
    }

    // 删除并备份试题
    const shiti_backup = [];
    for (let i = data.synonyms.length - 1; i >= 0; i--) {
        const synonym = data.synonyms[i];
        if (synonym["排除"] === "试题" || synonym["排除"] === "手写") {
            // 备份
            shiti_backup.push({
                synonym: synonym,
                answer: data.answers[i],
            });
            // 删除对应的项
            data.synonyms.splice(i, 1);
            data.answers.splice(i, 1);
        }
    }

    console.log("处理后 data:", data);
    console.log("备份的 shiti_backup:", shiti_backup);

    // console.log("data", data);
    isInChooseMode.value = false;
    // 判断6个还是7个选项
    let numberOption;
    if (none_of_above && !checkedNoneOfAbove.value) {
        numberOption = 7;
    } else {
        numberOption = 6;
    }

    // 为真多选作准备
    const excludedChineseSet2 = new Set(
        data.synonyms
            .filter((s) => s.排除 === "无")
            .flatMap((s) => {
                const answerObj = data.answers.find((a) => a.英文 === s.英文);
                if (!answerObj) return [];
                return answerObj.中文.includes("；")
                    ? answerObj.中文.split("；").map((w) => w.trim())
                    : [answerObj.中文.trim()];
            })
    );
    // console.log("excludedChineseSet2:", excludedChineseSet2);

    let allChineseSet2 = new Set(
        data.answers
            .flatMap((answer) => {
                const chinese = answer?.中文;
                if (!chinese) return []; // 如果中文不存在，返回空数组

                // 按分号拆分并去除两端空格
                return chinese.split("；").map((word) => word.trim());
            })
            .filter(
                (word) =>
                    word && // 过滤掉空字符串
                    !excludedChineseSet2.has(word) // 检查是否在排除集中
            )
    );
    // console.log("allChineseSet2: ", allChineseSet2);

    function shuffle(array) {
        let currentIndex = array.length,
            temporaryValue,
            randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
    // 不拼接选项
    function processData2(data, numberOption) {
        // 1. 乱序 synonyms
        const shuffledSynonyms = shuffle([...data.synonyms]);

        // 生成排除词集合
        const excludedChineseSet = new Set(
            data.synonyms
                .filter((s) => s.排除 === "无")
                .flatMap((s) => {
                    const answerObj = data.answers.find((a) => a.英文 === s.英文);
                    if (!answerObj) return [];
                    return answerObj.中文.includes("；")
                        ? answerObj.中文.split("；").map((w) => w.trim())
                        : [answerObj.中文.trim()];
                })
        );
        // console.log("excludedChineseSet:", excludedChineseSet);

        let allChineseSet = new Set(
            data.answers
                .flatMap((answer) => {
                    const chinese = answer?.中文;
                    if (!chinese) return []; // 如果中文不存在，返回空数组

                    // 按分号拆分并去除两端空格
                    return chinese.split("；").map((word) => word.trim());
                })
                .filter(
                    (word) =>
                        word && // 过滤掉空字符串
                        !excludedChineseSet.has(word) // 检查是否在排除集中
                )
        );
        // console.log("allChineseSet: ", allChineseSet);

        // 遍历 synonyms
        shuffledSynonyms.forEach((synonym) => {
            // 获取正确答案
            const answerObj = data.answers.find((a) => a.英文 === synonym.英文);
            if (!answerObj) return;

            let correctChineseAnswers = answerObj.中文.includes("；")
                ? answerObj.中文.split("；").map((w) => w.trim())
                : [answerObj.中文.trim()];

            // 移除当前 synonym 的 `选项` 及其相关内容
            correctChineseAnswers.forEach((answer) => allChineseSet.delete(answer));
            if (synonym.选项) {
                allChineseSet.delete(synonym.选项.trim());
            }
            // console.log('correctChineseAnswers', correctChineseAnswers);
            // 处理带 ; 的选项
            if (synonym.选项) {
                // 拆分 ; 并移除每个部分
                synonym.选项.split("；").forEach((opt) => {
                    const trimmedOpt = opt.trim();
                    if (trimmedOpt) {
                        allChineseSet.delete(trimmedOpt);
                    }
                });
            }
            // // 构建当前 synonym 可用的选项
            // let finalOptions = new Set(correctChineseAnswers);
            // if (synonym.选项) {
            //   synonym.选项.split("；").forEach((option) => {
            //     const trimmedOption = option.trim();
            //     if (trimmedOption) {
            //       finalOptions.add(trimmedOption);
            //     }
            //   });
            // }

            // // 随机填充选项，确保 `选项` 不会错位
            // let remainingChinese = shuffle(Array.from(allChineseSet));
            // remainingChinese.forEach((word) => {
            //   if (finalOptions.size < numberOption) {
            //     finalOptions.add(word);
            //   }
            // });

            // 构建当前 synonym 可用的选项
            let finalOptions = new Set(correctChineseAnswers);

            // 计算还能添加多少个选项
            const remainingSlots = numberOption - finalOptions.size;

            // 只有在还有空位时才添加额外选项
            if (synonym.选项 && remainingSlots > 0) {
                const extraOptions = synonym.选项
                    .split("；")
                    .map((opt) => opt.trim())
                    .filter((opt) => opt && !finalOptions.has(opt))
                    .slice(0, remainingSlots); // 限制数量

                extraOptions.forEach((option) => {
                    finalOptions.add(option);
                });
            }

            // 随机填充选项，确保不超过 numberOption
            let remainingChinese = shuffle(Array.from(allChineseSet));
            remainingChinese.forEach((word) => {
                if (finalOptions.size < numberOption) {
                    finalOptions.add(word);
                }
            });

            // 最终乱序
            synonym.中文 = shuffle(Array.from(finalOptions));

            // 恢复correctChineseAnswers，但不恢复synonym.选项
            correctChineseAnswers.forEach((answer) => {
                if (!excludedChineseSet.has(answer)) {
                    allChineseSet.add(answer);
                }
            });
        });

        // 重新调整 `answers` 顺序，使其与 `synonyms` 一致
        data.answers.sort((a, b) => {
            const indexA = shuffledSynonyms.findIndex((s) => s.英文 === a.英文);
            const indexB = shuffledSynonyms.findIndex((s) => s.英文 === b.英文);
            return indexA - indexB;
        });

        // 更新 `data.synonyms`
        data.synonyms = shuffledSynonyms;

        // 重新编号
        data.synonyms.forEach((item, index) => {
            item.序号 = index + 1;
        });
        data.answers.forEach((item, index) => {
            item.序号 = index + 1;
        });

        return data;
    }

    function processData(data, numberOption) {
        // Helper function to shuffle an array
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function generateDistractors(
            allChineseSet,
            num,
            correctChineseAnswers,
            allowCorrectAndIncorrectMix = false
        ) {
            const remainingChinese = Array.from(allChineseSet);
            const distractors = [];

            function getNonRepeatingPair() {
                let first, second;
                let attempts = 0;

                // Ensure first and second are not repeating with correctChineseAnswers
                while (attempts < remainingChinese.length) {
                    const [candidateFirst, candidateSecond] = shuffle(
                        remainingChinese.slice(0, 2)
                    );

                    if (
                        !correctChineseAnswers.includes(candidateFirst) &&
                        !correctChineseAnswers.includes(candidateSecond)
                    ) {
                        first = candidateFirst;
                        second = candidateSecond;
                        remainingChinese.splice(remainingChinese.indexOf(first), 1);
                        remainingChinese.splice(remainingChinese.indexOf(second), 1);
                        break;
                    }
                    attempts++;
                }

                return [first, second];
            }

            for (let i = 0; i < num; i++) {
                if (Math.random() < 0.2 && remainingChinese.length > 1) {
                    const [first, second] = getNonRepeatingPair();
                    if (first && second) {
                        distractors.push(`${first},${second}`);
                    }
                } else if (
                    allowCorrectAndIncorrectMix &&
                    Math.random() < 0.8 &&
                    correctChineseAnswers.length > 0 &&
                    remainingChinese.length > 0
                ) {
                    const correctAnswer = correctChineseAnswers.pop();
                    const incorrectAnswer = remainingChinese.shift();
                    distractors.push(`${correctAnswer},${incorrectAnswer}`);
                } else {
                    distractors.push(remainingChinese.shift());
                }
            }

            return shuffle(distractors);
        }

        const shuffledSynonyms = shuffle([...data.synonyms]);

        // Generate excluded words set
        const excludedChineseSet = new Set(
            data.synonyms
                .filter((s) => s.排除 === "无")
                .flatMap((s) => {
                    const answerObj = data.answers.find((a) => a.英文 === s.英文);
                    if (!answerObj) return [];
                    return answerObj.中文.includes("；")
                        ? answerObj.中文.split("；").map((w) => w.trim())
                        : [answerObj.中文.trim()];
                })
        );
        console.log("excludedChineseSet: ", excludedChineseSet);

        // Collect all Chinese options excluding those marked "无"
        let allChineseSet = new Set(
            data.answers
                .flatMap((answer) => {
                    const chinese = answer?.中文;
                    if (!chinese) return []; // 如果中文不存在，返回空数组

                    const splitWords = chinese.split("；").map((word) => word.trim());
                    return splitWords;
                })
                .filter((word) => {
                    const shouldKeep = word && !excludedChineseSet.has(word);
                    return shouldKeep;
                })
        );

        data.synonyms.forEach((synonym) => {
            if (synonym.选项) {
                if (synonym.选项.includes("；")) {
                    synonym.选项.split("；").forEach((opt) => {
                        allChineseSet.delete(opt.trim());
                    });
                } else {
                    allChineseSet.delete(synonym.选项.trim());
                }
            }
        });

        shuffledSynonyms.forEach((synonym) => {
            const answerObj = data.answers.find((a) => a.英文 === synonym.英文);
            const correctChineseAnswers = answerObj.中文.includes("；")
                ? answerObj.中文.split("；")
                : [answerObj.中文];

            correctChineseAnswers.forEach((answer) => allChineseSet.delete(answer));
            // console.log("allChineseSet", allChineseSet);
            let mixedChinese;
            if (correctChineseAnswers.length === 5) {
                const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
                const randomOption = Math.random();
                if (randomOption < 0.33) {
                    mixedChinese = shuffle([
                        ...shuffledCorrectAnswers,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 5,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = shuffledCorrectAnswers.join("；");
                } else if (randomOption < 0.66) {
                    const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
                    const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]},${shuffledCorrectAnswers[4]}`;
                    mixedChinese = shuffle([
                        mergedAnswer1,
                        mergedAnswer2,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 2,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}`;
                } else {
                    const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
                    const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]}`;
                    mixedChinese = shuffle([
                        mergedAnswer1,
                        mergedAnswer2,
                        shuffledCorrectAnswers[4],
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 3,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}；${shuffledCorrectAnswers[4]}`;
                }
            } else if (correctChineseAnswers.length === 4) {
                const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
                const randomOption = Math.random();
                if (randomOption < 0.25) {
                    mixedChinese = shuffle([
                        ...shuffledCorrectAnswers,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 4,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = shuffledCorrectAnswers.join("；");
                } else if (randomOption < 0.5) {
                    const mergedAnswer = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]},${shuffledCorrectAnswers[2]}`;
                    mixedChinese = shuffle([
                        mergedAnswer,
                        shuffledCorrectAnswers[3],
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 2,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[3]}`;
                } else if (randomOption < 0.75) {
                    const mergedAnswer1 = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
                    const mergedAnswer2 = `${shuffledCorrectAnswers[2]},${shuffledCorrectAnswers[3]}`;
                    mixedChinese = shuffle([
                        mergedAnswer1,
                        mergedAnswer2,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 2,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer1}；${mergedAnswer2}`;
                } else {
                    const mergedAnswer = `${shuffledCorrectAnswers[0]},${shuffledCorrectAnswers[1]}`;
                    mixedChinese = shuffle([
                        mergedAnswer,
                        shuffledCorrectAnswers[2],
                        shuffledCorrectAnswers[3],
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 3,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[2]}；${shuffledCorrectAnswers[3]}`;
                }
            } else if (correctChineseAnswers.length === 3) {
                const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
                if (Math.random() < 0.4) {
                    // if (Math.random() < 0) {
                    const [first, second] = shuffle([
                        shuffledCorrectAnswers[0],
                        shuffledCorrectAnswers[1],
                    ]);
                    const mergedAnswer = `${first},${second}`;
                    mixedChinese = shuffle([
                        mergedAnswer,
                        shuffledCorrectAnswers[2],
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 2,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = `${mergedAnswer}；${shuffledCorrectAnswers[2]}`;
                } else {
                    mixedChinese = shuffle([
                        ...shuffledCorrectAnswers,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 3,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = shuffledCorrectAnswers.join("；");
                }
            } else if (correctChineseAnswers.length === 2) {
                const shuffledCorrectAnswers = shuffle([...correctChineseAnswers]);
                if (Math.random() < 0.2) {
                    // if (Math.random() < 0) {
                    const [first, second] = shuffle([
                        shuffledCorrectAnswers[0],
                        shuffledCorrectAnswers[1],
                    ]);
                    const mergedAnswer = `${first},${second}`;
                    mixedChinese = shuffle([
                        mergedAnswer,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 1,
                            correctChineseAnswers,
                            true
                        ),
                    ]);
                    answerObj.中文 = mergedAnswer;
                } else {
                    mixedChinese = shuffle([
                        ...shuffledCorrectAnswers,
                        ...generateDistractors(
                            allChineseSet,
                            numberOption - 2,
                            correctChineseAnswers
                        ),
                    ]);
                    answerObj.中文 = shuffledCorrectAnswers.join("；");
                }
            } else {
                const remainingChinese = shuffle(Array.from(allChineseSet));
                mixedChinese = shuffle([
                    ...correctChineseAnswers,
                    ...generateDistractors(
                        allChineseSet,
                        numberOption - correctChineseAnswers.length,
                        correctChineseAnswers,
                        false
                    ),
                ]);
            }

            mixedChinese = mixedChinese.filter((option) => option);
            while (mixedChinese.length < numberOption) {
                mixedChinese.push("无");
            }

            synonym.中文 = mixedChinese.slice(0, numberOption);

            correctChineseAnswers.forEach((answer) => {
                if (!excludedChineseSet.has(answer)) {
                    allChineseSet.add(answer);
                }
            });
        });

        data.answers.sort((a, b) => {
            const indexA = shuffledSynonyms.findIndex((s) => s.英文 === a.英文);
            const indexB = shuffledSynonyms.findIndex((s) => s.英文 === b.英文);
            return indexA - indexB;
        });

        data.synonyms = shuffledSynonyms;

        data.synonyms.forEach((item, index) => {
            item.序号 = index + 1;
        });

        data.answers.forEach((item, index) => {
            item.序号 = index + 1;
        });

        return data;
    }

    if (data.merge_option) {
        console.log("processData");
        processData(data, numberOption);
    } else {
        console.log("processData2");
        processData2(data, numberOption);
    }
    console.log("data_pinjie: ", data);

    // 增加中译英选项
    // function processData3(data, reversd_number, numberOption) {
    //   reversd_number = 16
    //   // 创建 data 的深拷贝
    //   const originalData = JSON.parse(JSON.stringify(data));

    //   // 交换 data.answers 中的中文和英文，并处理分号分割
    //   const processedAnswers = data.answers.map((item) => {
    //     let chineseOptions;
    //     if (item["中文"].includes("；")) {
    //       chineseOptions = item["中文"].split("；");
    //     } else if (item["中文"].includes(",")) {
    //       chineseOptions = item["中文"].split(",");
    //     } else {
    //       chineseOptions = [item["中文"]];
    //     }

    //     const randomChinese =
    //       chineseOptions[Math.floor(Math.random() * chineseOptions.length)];

    //     return {
    //       序号: item["序号"],
    //       英文: randomChinese,
    //       中文: item["英文"],
    //     };
    //   });
    //   console.log("processedAnswers: ", processedAnswers);

    //   // 获取所有英文答案
    //   const allChinese = processedAnswers.map((item) => item["英文"]);
    //   const allEnglish = processedAnswers.map((item) => item["中文"]);

    //   const processedSynonyms = data.synonyms.map((synonym) => {
    //     // 获取正确答案的中文
    //     const correctAnswer = processedAnswers.find(
    //       (answer) => answer["中文"] === synonym["英文"]
    //     );

    //     const correctChinese = correctAnswer.英文;
    //     // console.log('correctChinese: ', correctChinese);

    //     // 生成一个包含正确答案的随机中文列表
    //     const englishOptions = [correctAnswer.中文];
    //     const addedAnswers = new Set(englishOptions);
    //     while (englishOptions.length < numberOption) {
    //       if (addedAnswers.size >= allEnglish.length) {
    //         englishOptions.push("无"); // 用“无”代替
    //       } else {
    //         const randomAnswer =
    //           allEnglish[Math.floor(Math.random() * allEnglish.length)];
    //         // console.log("randomAnswer: ", randomAnswer);
    //         if (
    //           randomAnswer !== null &&
    //           randomAnswer !== "" &&
    //           !addedAnswers.has(randomAnswer)
    //         ) {
    //           // 获取新添加的中文对应的英文
    //           const randomAnswerEnglish = processedAnswers.find(
    //             (answer) => answer["中文"] === randomAnswer
    //           )?.英文;
    //           // console.log("randomAnswerEnglish: ", randomAnswerEnglish);

    //           const isDuplicate = englishOptions.some((existingChinese) => {
    //             const existingAnswerEnglish = processedAnswers.find(
    //               (answer) => answer["中文"] === existingChinese
    //             )?.英文;

    //             // Split the existing answer by '；' and check if it contains randomAnswerEnglish
    //             if (existingAnswerEnglish) {
    //               const splitExistingAnswers = existingAnswerEnglish.split("；");
    //               return splitExistingAnswers.includes(randomAnswerEnglish);
    //             }
    //             return false;
    //           });

    //           if (!isDuplicate) {
    //             englishOptions.push(randomAnswer);
    //             addedAnswers.add(randomAnswer);
    //           }
    //         }
    //       }
    //     }

    //     // 随机打乱数组顺序
    //     for (let i = englishOptions.length - 1; i > 0; i--) {
    //       const j = Math.floor(Math.random() * (i + 1));
    //       [englishOptions[i], englishOptions[j]] = [
    //         englishOptions[j],
    //         englishOptions[i],
    //       ];
    //     }

    //     return {
    //       序号: synonym["序号"],
    //       英文: correctChinese,
    //       中文: englishOptions,
    //     };
    //   });

    //   // console.log("processedSynonyms: ", processedSynonyms);

    //   // 从 processedAnswers 和 processedSynonyms 中随机选取 reversd_number 个
    //   const selectedIndexes = new Set();
    //   while (selectedIndexes.size < reversd_number) {
    //     selectedIndexes.add(Math.floor(Math.random() * processedAnswers.length));
    //   }

    //   // console.log('selectedIndexes: ', selectedIndexes);

    //   const selectedAnswers = Array.from(selectedIndexes).map(
    //     (index) => processedAnswers[index]
    //   );
    //   // console.log('selectedAnswers: ', selectedAnswers);

    //   const selectedSynonyms = Array.from(selectedIndexes).map(
    //     (index) => processedSynonyms[index]
    //   );
    //   // console.log("selectedSynonyms: ", selectedSynonyms);

    //   // 在 originalData 中的 answers 和 synonyms 随机插入
    //   selectedAnswers.forEach((answer, index) => {
    //     const randomPosition = Math.floor(
    //       Math.random() * (originalData.answers.length + 1)
    //     );
    //     originalData.answers.splice(
    //       randomPosition,
    //       0,
    //       selectedAnswers.find((a) => a.序号 === answer.序号)
    //     );
    //     originalData.synonyms.splice(
    //       randomPosition,
    //       0,
    //       selectedSynonyms.find((s) => s.序号 === selectedSynonyms[index].序号)
    //     );
    //   });

    //   // 重新整理序号
    //   originalData.answers.forEach((item, index) => {
    //     item.序号 = index + 1;
    //   });
    //   originalData.synonyms.forEach((item, index) => {
    //     item.序号 = index + 1;
    //   });

    //   // 返回处理后的数据和原始数据
    //   return {
    //     processedData: { answers: processedAnswers, synonyms: processedSynonyms },
    //     NewData: originalData,
    //   };
    // }
    function processData3(data, reversd_number, numberOption) {
        // reversd_number = 10
        // 创建 data 的深拷贝（在原题库上插入“反转题”）
        const originalData = JSON.parse(JSON.stringify(data));

        // ===== 工具：拆分中文释义（兼容 ：；，,;）=====
        function splitMeanings(s) {
            if (!s) return [];
            return s
                .replace(/，/g, ",")
                .replace(/；/g, ";")
                .split(/[;,]/)
                .map((x) => x.trim())
                .filter(Boolean);
        }

        // ===== 建索引：英文 -> Set(中文释义) =====
        // 仅用于 B 方案：生成干扰项时，排除“也包含题干中文释义”的英文
        const englishToMeanings = new Map();
        data.answers.forEach((item) => {
            const eng = item["英文"]; // 英文词
            const meanings = splitMeanings(item["中文"]); // 中文释义列表
            if (!englishToMeanings.has(eng)) englishToMeanings.set(eng, new Set());
            meanings.forEach((m) => englishToMeanings.get(eng).add(m));
        });

        // ===== 1) 反转 answers：中文题干(随机选一个中文释义) + 正确答案(英文) =====
        const processedAnswers = data.answers.map((item) => {
            const meanings = splitMeanings(item["中文"]);
            const chosenChinese =
                meanings.length > 0
                    ? meanings[Math.floor(Math.random() * meanings.length)]
                    : "";

            // 注意：为最小改动，沿用你的字段名：
            //   英文字段承载“题干中文”，中文字段承载“正确英文”
            return {
                序号: item["序号"],
                英文: chosenChinese, // 题干中文
                中文: item["英文"], // 正确英文
            };
        });

        // 候选池
        const allPromptChinese = processedAnswers.map((x) => x["英文"]); // 所有题干中文（可能重复）
        const allOptionEnglish = processedAnswers.map((x) => x["中文"]); // 所有可选英文（英文词）

        // ===== 2) 生成 synonyms：题干中文 + 英文选项数组（唯一正确）=====
        const processedSynonyms = data.synonyms.map((synonym) => {
            // 找到该题的正确项（根据英文词匹配）
            const correctAnswer = processedAnswers.find(
                (a) => a["中文"] === synonym["英文"]
            );

            // 兜底：数据不一致时，给一个可运行的返回
            if (!correctAnswer) {
                return {
                    序号: synonym["序号"],
                    英文: "", // 题干中文
                    中文: Array.from({ length: numberOption }, () => "无"),
                };
            }

            const promptChinese = correctAnswer["英文"]; // 题干中文
            const correctEnglish = correctAnswer["中文"]; // 正确英文

            // 选项数组（存英文）
            const options = [correctEnglish];
            const added = new Set(options);

            // === B 方案核心：干扰项英文必须排除“也包含 promptChinese”的英文 ===
            // 候选干扰英文池：不为空、不是正确英文、且该英文释义集合不含 promptChinese
            const candidatePool = allOptionEnglish.filter((eng) => {
                if (!eng || eng === correctEnglish) return false;
                const meaningsSet = englishToMeanings.get(eng);
                // 如果该英文有释义且包含题干中文 => 也算对，必须排除
                if (meaningsSet && meaningsSet.has(promptChinese)) return false;
                return true;
            });

            // 填充到 numberOption
            while (options.length < numberOption) {
                // 如果候选池不足，补“无”
                if (added.size >= 1 + candidatePool.length) {
                    // added.size>=1 表示已有正确答案；candidatePool.length 表示最多可加入的干扰数
                    options.push("无");
                    continue;
                }

                const pick =
                    candidatePool[Math.floor(Math.random() * candidatePool.length)];
                if (!pick || added.has(pick)) continue;

                options.push(pick);
                added.add(pick);
            }

            // 随机打乱
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

            return {
                序号: synonym["序号"],
                英文: promptChinese, // 题干中文
                中文: options, // 英文选项数组
            };
        });

        // ===== 3) 随机选择 reversd_number 个反转题插入 originalData =====
        const maxSelectable = Math.min(reversd_number, processedAnswers.length);
        const selectedIndexes = new Set();
        while (selectedIndexes.size < maxSelectable) {
            selectedIndexes.add(Math.floor(Math.random() * processedAnswers.length));
        }

        const selectedAnswers = Array.from(selectedIndexes).map(
            (index) => processedAnswers[index]
        );
        const selectedSynonyms = Array.from(selectedIndexes).map(
            (index) => processedSynonyms[index]
        );

        // 随机插入
        selectedAnswers.forEach((answer, idx) => {
            const randomPosition = Math.floor(
                Math.random() * (originalData.answers.length + 1)
            );

            originalData.answers.splice(
                randomPosition,
                0,
                selectedAnswers.find((a) => a.序号 === answer.序号)
            );

            originalData.synonyms.splice(
                randomPosition,
                0,
                selectedSynonyms.find((s) => s.序号 === selectedSynonyms[idx].序号)
            );
        });

        // ===== 4) 重新整理序号 =====
        originalData.answers.forEach((item, index) => {
            item.序号 = index + 1;
        });
        originalData.synonyms.forEach((item, index) => {
            item.序号 = index + 1;
        });

        return {
            processedData: { answers: processedAnswers, synonyms: processedSynonyms },
            NewData: originalData,
        };
    }

    let processedData, NewData;
    if (reversd_number > 0) {
        ({ processedData, NewData } = processData3(
            data,
            reversd_number,
            numberOption
        ));
        data = NewData;
    }

    console.log("data_zhongyiying: ", data);

    if (none_of_above && !checkedNoneOfAbove.value) {
        function replaceWithNoneOfTheAbove(data) {
            // console.log('data: ', data);
            const noneOfTheAbove = "以上都不对";

            // 保存替换前的正确答案
            const originalAnswers = data.answers.map((answer) => ({
                英文: answer.英文,
                中文: answer.中文,
            }));
            // console.log("originalAnswers: ", originalAnswers);

            data.synonyms.forEach((synonym) => {
                // 找到正确答案
                // console.log("synonym.英文", synonym.英文)
                let correctAnswer;
                let correctAnswerObj = data.answers.find(
                    (answer) => answer.英文 === synonym.英文
                );

                if (!correctAnswerObj) {
                    // 在没有找到对应答案的情况下，检查中文
                    correctAnswerObj = data.answers.find((answer) => {
                        // 检查中文是否包含分隔符
                        if (answer.中文.includes("；")) {
                            // 分割并逐个检查
                            const options = answer.中文.split("；");
                            return options.some((option) => option.trim() === synonym.英文);
                        }
                        return answer.中文 === synonym.英文;
                    });
                    // console.log('correctAnswerObj2: ', correctAnswerObj);
                }

                if (correctAnswerObj) {
                    correctAnswer = correctAnswerObj.中文;
                }

                // 解析正确答案为数组
                const correctAnswers = correctAnswer.includes("；")
                    ? correctAnswer.split("；")
                    : [correctAnswer];

                // console.log('correctAnswers: ', correctAnswers);
                console.log("synonym.中文: ", synonym.中文);
                // console.log("-----------------");
                // 决定是否替换正确答案，概率在10%-20%之间
                let replaceCorrectAnswer = false;
                if (Math.random() < 0.14) {
                    // if (Math.random() < 2) {
                    replaceCorrectAnswer = true;
                }

                let flattext = 0;
                // if (correctAnswerObj.英文 === "plant") {
                //   replaceCorrectAnswer = true;
                //   flattext = 1;
                // }
                function splitParts(text) {
                    if (text === null || text === undefined) return [];
                    return String(text)
                        .split(/[；,，]/g)
                        .map((s) => s.trim())
                        .filter(Boolean);
                }

                // correctPartsFlat: 例如 ["种植","工厂","植物"]
                function isEquivalentToCorrect(option, correctPartsFlat) {
                    if (!option) return false;
                    const opt = String(option).trim();

                    // 单项直接命中
                    if (correctPartsFlat.includes(opt)) return true;

                    // 拼接项：拆分后与 correctPartsFlat 集合相等（忽略顺序）
                    const optParts = splitParts(opt);
                    if (optParts.length <= 1) return false;

                    const correctSet = new Set(correctPartsFlat);
                    const optSet = new Set(optParts);

                    if (optSet.size !== correctSet.size) return false;
                    for (const p of correctSet) {
                        if (!optSet.has(p)) return false;
                    }
                    return true;
                }

                if (replaceCorrectAnswer) {
                    // 替换所有正确答案
                    // synonym.中文 = synonym.中文.map((option) =>
                    //   correctAnswers.includes(option) ? noneOfTheAbove : option
                    // );
                    synonym.中文 = synonym.中文.map((option) =>
                        isEquivalentToCorrect(option, correctAnswers)
                            ? noneOfTheAbove
                            : option
                    );
                    correctAnswerObj.中文 = noneOfTheAbove;
                } else {
                    // 处理选项数组
                    // const optionsArray = synonym.选项 ? synonym.选项.split("；") : [];
                    const optionsArray = synonym.选项
                        ? synonym.选项
                            .split(/[；,，]/g)
                            .map((s) => s.trim())
                            .filter(Boolean)
                        : [];
                    // 替换一个错误答案
                    let replaced = false;

                    // 优先替换不在 correctAnswers 和 optionsArray 中的内容
                    for (let i = 0; i < synonym.中文.length; i++) {
                        if (
                            !correctAnswers.includes(synonym.中文[i]) && // 不在正确答案中
                            !optionsArray.includes(synonym.中文[i]) && // 不在选项数组中
                            synonym.中文[i] !== null
                        ) {
                            synonym.中文[i] = noneOfTheAbove;
                            replaced = true;
                            break;
                        }
                    }
                    // 如果没有替换成功，随机替换一个在 optionsArray 中的内容
                    if (!replaced) {
                        const possibleIndices = [];

                        // 收集在 optionsArray 中的内容的索引
                        for (let i = 0; i < synonym.中文.length; i++) {
                            if (
                                optionsArray.includes(synonym.中文[i]) &&
                                synonym.中文[i] !== null
                            ) {
                                possibleIndices.push(i);
                            }
                        }

                        // 如果有可替换的索引，从中随机选择一个进行替换
                        if (possibleIndices.length > 0) {
                            const randomIndex =
                                possibleIndices[
                                Math.floor(Math.random() * possibleIndices.length)
                                ];
                            synonym.中文[randomIndex] = noneOfTheAbove;
                            replaced = true;
                        }
                    }

                    // 如果所有内容都是正确答案或 synonym.选项中的内容，并且没有成功替换
                    if (!replaced) {
                        // 随机替换一个内容
                        const randomIndex = Math.floor(Math.random() * synonym.中文.length);
                        synonym.中文[randomIndex] = noneOfTheAbove;
                    }
                }

                // 确保“以上都不对”在列表最后一个位置
                synonym.中文 = synonym.中文
                    .filter((option) => option !== noneOfTheAbove)
                    .concat(noneOfTheAbove);

                // const correctPartsFlat = correctAnswers.flatMap(splitParts);
                // while (synonym.中文.length < 7) {
                //   let randomAnswer = null;

                //   // 循环直到找到一个中文字符
                //   do {
                //     randomAnswer =
                //       originalAnswers[
                //         Math.floor(Math.random() * originalAnswers.length)
                //       ].中文;
                //   } while (
                //     (randomAnswer && randomAnswer.charCodeAt(0) <= 255)
                //     || isEquivalentToCorrect(randomAnswer, correctPartsFlat)
                //   );

                //   // 检查随机答案是否在当前数组中且不为 null
                //   if (!synonym.中文.includes(randomAnswer) && randomAnswer !== null) {
                //     synonym.中文.splice(synonym.中文.length - 1, 0, randomAnswer);
                //   }
                // }
                const correctPartsFlat = correctAnswers.flatMap(splitParts);

                while (synonym.中文.length < 7) {
                    const pool = originalAnswers.filter(
                        (ans) =>
                            ans.中文 &&
                            ans.中文.charCodeAt(0) > 255 && // 是中文
                            !isEquivalentToCorrect(ans.中文, correctPartsFlat) && // 不是正确答案
                            !synonym.中文.includes(ans.中文) // 不重复
                    );

                    if (pool.length > 0) {
                        // 可选：随机选一个，避免总是补同一个
                        const candidate = pool[Math.floor(Math.random() * pool.length)];
                        synonym.中文.splice(synonym.中文.length - 1, 0, candidate.中文);
                    } else {
                        // 兜底：用“无”补齐
                        if (!synonym.中文.includes("无")) {
                            synonym.中文.splice(synonym.中文.length - 1, 0, "无");
                        } else {
                            // 如果“无”已经存在，就继续插“无”（或 break，视你产品需求）
                            synonym.中文.splice(synonym.中文.length - 1, 0, "无");
                        }
                    }
                }
            });

            // 更新 answers 数组并添加 "正确答案" 字段
            data.answers.forEach((answer) => {
                if (answer.中文 === noneOfTheAbove) {
                    // 找到替换前的正确答案
                    const originalCorrectAnswer = originalAnswers.find(
                        (original) => original.英文 === answer.英文
                    ).中文;
                    answer.正确答案 = originalCorrectAnswer;
                } else {
                    answer.正确答案 = answer.中文;
                }
            });

            return data;
        }

        data = replaceWithNoneOfTheAbove(data);
    }

    // 去掉可能的；
    function replaceSemicolon(data) {
        let isUpdated = false;

        // 深拷贝 data，以防止直接修改原数据
        const newData = JSON.parse(JSON.stringify(data));

        newData.synonyms.forEach((synonym) => {
            synonym.中文 = synonym.中文.map((item) => {
                if (item.includes("；")) {
                    console.log("去掉可能的分号");
                    console.log("item", item);
                    isUpdated = true;
                    return item.replace(/；/g, ",");
                }
                return item;
            });
        });

        return isUpdated ? newData : data;
    }
    data = replaceSemicolon(data);

    const newTabsName = ["全部", ...tabsName.value];
    const isRewardEligible = data["progressPercentage"] !== 100;
    // console.log("type", type);
    const autoplay2 = type === 1 ? 10000 : 8000;

    function redirect() {
        function getStatusMessage(checkedSpell, checkedNoneOfAbove) {
            if (checkedSpell && checkedNoneOfAbove) {
                return "拼写和以上都不对关闭，消费2💎";
            } else if (checkedSpell) {
                return "拼写关闭，提交后消费1💎";
            } else if (checkedNoneOfAbove) {
                return "以上都不对关闭，提交后消费1💎";
            } else {
                return "";
            }
        }

        if (mode == 0) {
            const message = getStatusMessage(
                checkedSpell.value,
                checkedNoneOfAbove.value
            );
            if (message) {
                showToast({
                    duration: 3000,
                    closeOnClick: true,
                    closeOnClickOverlay: true,
                    message: message,
                });
            }
            if (device_type == "pc") {
                router.push({
                    path: "/studentAccountItemPC",
                    state: {
                        data: JSON.stringify(data),
                        nid: originalData.value[index].nid,
                        title: data["title"],
                        type: data["type"],
                        username: data["username"],
                        usercoins: usercoins.value,
                        isRewardEligible: isRewardEligible,
                        lock_spell: lock_spell.value,
                        checkedNoneOfAbove: checkedNoneOfAbove.value,
                        checkedSpell: checkedSpell.value,
                        RateOrigin: data["rate"],
                    },
                });
            } else {
                router.push({
                    path: "/studentAccountItem",
                    state: {
                        data: JSON.stringify(data),
                        nid: originalData.value[index].nid,
                        title: data["title"],
                        type: data["type"],
                        username: data["username"],
                        usercoins: usercoins.value,
                        isRewardEligible: isRewardEligible,
                        lock_spell: lock_spell.value,
                        checkedNoneOfAbove: checkedNoneOfAbove.value,
                        checkedSpell: checkedSpell.value,
                        RateOrigin: data["rate"],
                    },
                });
            }

        }
        if (mode == 1) {
            const message = getStatusMessage(
                checkedSpell.value,
                checkedNoneOfAbove.value
            );
            if (message) {
                showToast({
                    duration: 3000,
                    closeOnClick: true,
                    closeOnClickOverlay: true,
                    message: message,
                });
            }
            // console.log('data', data);
            // console.log('nid', originalData.value[index].nid);
            // console.log('title', data["title"]);
            // console.log('type', data["type"]);
            // console.log('username', data["username"]);
            // console.log('usercoins', usercoins.value);
            // console.log('isRewardEligible', isRewardEligible);
            // console.log('autoplay2', autoplay2);
            // console.log('lock_spell', lock_spell.value);
            if (device_type == "pc") {
                router.push({
                    path: "/studentAccountSwipePC",
                    state: {
                        data: JSON.stringify(data),
                        nid: originalData.value[index].nid,
                        title: data["title"],
                        type: data["type"],
                        username: data["username"],
                        usercoins: usercoins.value,
                        isRewardEligible: isRewardEligible,
                        autoplay2: autoplay2,
                        lock_spell: lock_spell.value,
                        checkedNoneOfAbove: checkedNoneOfAbove.value,
                        checkedSpell: checkedSpell.value,
                        RateOrigin: data["rate"],
                    },
                });
            } else {
                router.push({
                    path: "/studentAccountSwipe",
                    state: {
                        data: JSON.stringify(data),
                        nid: originalData.value[index].nid,
                        title: data["title"],
                        type: data["type"],
                        username: data["username"],
                        usercoins: usercoins.value,
                        isRewardEligible: isRewardEligible,
                        autoplay2: autoplay2,
                        lock_spell: lock_spell.value,
                        checkedNoneOfAbove: checkedNoneOfAbove.value,
                        checkedSpell: checkedSpell.value,
                        RateOrigin: data["rate"],
                    },
                });

            }

        }
        if (mode == 2) {
            sessionStorage.setItem("testFreshFlag", false);
            router.push({
                path: "/studentAccountTest",
                state: {
                    checkedNoneOfAbove: checkedNoneOfAbove.value,
                    checkedSpell: checkedSpell.value,
                    data: JSON.stringify(data),
                    nid: originalData.value[index].nid,
                    title: data["title"],
                    type: data["type"],
                    username: data["username"],
                    usercoins: usercoins.value,
                    isRewardEligible: isRewardEligible,
                    lock_spell: lock_spell.value,
                },
            });
        }
        if (mode == 4) {
            const message = getStatusMessage(
                checkedSpell.value,
                checkedNoneOfAbove.value
            );
            if (message) {
                showToast({
                    duration: 3000,
                    closeOnClick: true,
                    closeOnClickOverlay: true,
                    message: message,
                });
            }
            router.push({
                path: "/studentAccountChallenge",
                state: {
                    data: JSON.stringify(data),
                    nid: originalData.value[index].nid,
                    title: data["title"],
                    type: data["type"],
                    username: data["username"],
                    usercoins: usercoins.value,
                    isRewardEligible: isRewardEligible,
                    autoplay2: autoplay2,
                    lock_spell: lock_spell.value,
                    checkedNoneOfAbove: checkedNoneOfAbove.value,
                    checkedSpell: checkedSpell.value,
                    RateOrigin: data["rate"],
                },
            });
        }
    }

    function getZhenduoxuan(data) {
        // 如果没有none_of_above, 添加正确答案
        if (!data.answers.every((answer) => "正确答案" in answer)) {
            data.answers.forEach((answer) => {
                if (!("正确答案" in answer)) {
                    answer.正确答案 = answer.中文;
                }
            });
        }

        if (data.merge_option) {
            // 有拼接
            data.answers.forEach((answer, index) => {
                // 只有当 answer.中文 不为 "以上都不对"，且 answer.正确答案 中包含 "；" 时才处理
                if (
                    (answer.中文 !== "以上都不对" &&
                        answer.正确答案 &&
                        answer.正确答案.includes("；")) ||
                    (answer.中文 !== "以上都不对" && answer.中文.includes("；"))
                ) {
                    // 同时处理中文分号和英文逗号作为分隔符的情况
                    let parts = answer.中文
                        .split(/[；,]/g)
                        .map((s) => s.trim())
                        .filter((s) => s);

                    // 根据 parts 的数量随机确定 numToRemove（删除0个概率0.3，1个的概率0.3，2个的概率0.4）
                    let probabilities = {
                        2: [0.3, 0.7],
                        // 3: [0.1, 0.5, 0.4],
                        3: [0, 0.8, 0.2],
                        4: [0.2, 0.2, 0.2, 0.4],
                        5: [0.15, 0.15, 0.15, 0.15, 0.4],
                    };
                    let distribution = probabilities[parts.length] || [1]; // 默认为 100% 选择 0
                    let randomValue = Math.random();
                    let cumulative = 0;
                    let numToRemove = 0;

                    for (let i = 0; i < distribution.length; i++) {
                        cumulative += distribution[i];
                        if (randomValue < cumulative) {
                            numToRemove = i;
                            break;
                        }
                    }
                    numToRemove = Math.min(numToRemove, parts.length);

                    // 随机删除 numToRemove 个部分
                    for (let i = 0; i < numToRemove; i++) {
                        if (parts.length === 0) break;
                        let removeIndex = Math.floor(Math.random() * parts.length); // 随机删除的索引
                        let removed = parts.splice(removeIndex, 1)[0]; // 随机删除的元素存储到removed
                        console.log("removed: ", removed);

                        // 使用相同的索引，在 data.synonyms 中找到对应的项
                        let synonymItem = data.synonyms[index];
                        // console.log('synonymItem: ', synonymItem);
                        if (synonymItem) {
                            // 找到 removed 在 synonyms 里对应的索引（比对时去除首尾空格）
                            let synonymIndex = synonymItem.中文.findIndex(
                                (item) => item.trim() === removed
                            );
                            if (synonymIndex !== -1) {
                                let correctAnswers = answer.正确答案
                                    .split("；")
                                    .map((s) => s.trim());
                                // 筛选出可用的替换项：allChineseSet2 中不包含当前 synonyms 里的中文
                                let availableOptions = [...allChineseSet2]
                                    .flatMap((ch) =>
                                        /[,；]/.test(ch) // 检查是否包含英文逗号或中文分号
                                            ? ch.split(/[,；]/).map((item) => item.trim()) // 按逗号或分号拆分，并去掉空格
                                            : [ch]
                                    )
                                    .filter(
                                        (ch) =>
                                            !synonymItem.中文.some((item) =>
                                                /[,；]/.test(item)
                                                    ? item
                                                        .split(/[,；]/)
                                                        .map((i) => i.trim())
                                                        .includes(ch)
                                                    : item.trim() === ch
                                            ) &&
                                            // 新增条件：不与正确答案重复
                                            !correctAnswers.includes(ch.trim())
                                    );

                                // 替换答案
                                // 更新答案的中文字段，将处理后的数组重新用 "；" 连接
                                if (answer.英文 == "for + 时间段") {
                                    console.log(
                                        "synonymItem.中文[synonymIndex]",
                                        synonymItem.中文[synonymIndex]
                                    );
                                    console.log("answer.中文", answer.中文);
                                    console.log("-------------------");
                                }
                                // answer.中文 = parts.join("；");

                                // const regex = new RegExp(
                                //   `[；,]?\\s*${synonymItem.中文[synonymIndex]}`,
                                //   "g"
                                // );
                                function escapeRegExp(string) {
                                    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                }

                                const rawKeyword = synonymItem.中文[synonymIndex];
                                const keyword = escapeRegExp(rawKeyword);
                                // const regex = new RegExp(`[；,]?\\s*${keyword}`, "g");
                                const regex = new RegExp(
                                    `(?:^|[；,]\\s*)${keyword}(?=\\s*[；,]|$)`,
                                    "g"
                                );
                                answer.中文 = answer.中文.replace(regex, "");

                                // 清理可能遗留的多余分隔符
                                answer.中文 = answer.中文
                                    .replace(/^[；,]\s*|\s*[；,]$/g, "")
                                    .replace(/[；,]\s*[；,]/g, "；");

                                if (answer.英文 == "for + 时间段") {
                                    console.log("answer.中文2", answer.中文);
                                }

                                if (availableOptions.length > 0) {
                                    let randomReplacement =
                                        availableOptions[
                                        Math.floor(Math.random() * availableOptions.length)
                                        ];
                                    console.log("randomReplacement", randomReplacement);
                                    console.log("------------------------------------");
                                    synonymItem.中文[synonymIndex] = randomReplacement;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // 无拼接
            // console.log(111111111)
            data.answers.forEach((answer, index) => {
                // 只有当 answer.中文 不为 "以上都不对"，且 answer.正确答案 中包含 "；" 时才处理
                if (
                    answer.中文 !== "以上都不对" &&
                    answer.正确答案 &&
                    answer.正确答案.includes("；")
                ) {
                    // 以 "；" 拆分中文字段，并去除首尾空格
                    let parts = answer.中文.split("；").map((s) => s.trim());

                    // 根据 parts 的数量随机确定 numToRemove （删除0个概率0.3，1个的概率0.3，2个的概率0.4）
                    let probabilities = {
                        2: [0.3, 0.7],
                        3: [0.3, 0.3, 0.4],
                        // 3: [0, 1, 0],
                        4: [0.2, 0.2, 0.2, 0.4],
                        5: [0.15, 0.15, 0.15, 0.15, 0.4],
                    };
                    let distribution = probabilities[parts.length] || [1]; // 默认为 100% 选择 0
                    let randomValue = Math.random();
                    let cumulative = 0;
                    let numToRemove = 0;

                    for (let i = 0; i < distribution.length; i++) {
                        cumulative += distribution[i];
                        if (randomValue < cumulative) {
                            numToRemove = i;
                            break;
                        }
                    }
                    numToRemove = Math.min(numToRemove, parts.length);

                    // 随机删除 numToRemove 个部分
                    for (let i = 0; i < numToRemove; i++) {
                        if (parts.length === 0) break;
                        let removeIndex = Math.floor(Math.random() * parts.length);
                        let removed = parts.splice(removeIndex, 1)[0];
                        console.log("removed: ", removed);

                        // 使用相同的索引，在 data.synonyms 中找到对应的项
                        let synonymItem = data.synonyms[index];
                        if (synonymItem) {
                            // 找到 removed 在 synonyms 里对应的索引（比对时去除首尾空格）
                            let synonymIndex = synonymItem.中文.findIndex(
                                (item) => item.trim() === removed
                            );
                            if (synonymIndex !== -1) {
                                let correctAnswers = answer.正确答案
                                    .split("；")
                                    .map((s) => s.trim());
                                // 筛选出可用的替换项：allChineseSet2 中不包含当前 synonyms 里的中文和不与正确答案重复
                                let availableOptions = [...allChineseSet2].filter(
                                    (ch) =>
                                        !synonymItem.中文.includes(ch) &&
                                        !correctAnswers.includes(ch.trim())
                                );
                                if (availableOptions.length > 0) {
                                    let randomReplacement =
                                        availableOptions[
                                        Math.floor(Math.random() * availableOptions.length)
                                        ];
                                    console.log("randomReplacement", randomReplacement);
                                    console.log("------------------------------------");
                                    synonymItem.中文[synonymIndex] = randomReplacement;
                                }
                            }
                        }
                    }

                    // 更新答案的中文字段，将处理后的数组重新用 "；" 连接
                    answer.中文 = parts.join("；");
                }
            });
        }
        return data;
    }

    function shuffleArray(arr) {
        const newArr = arr.slice(); // 拷贝一份数组
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }
    function insertBackupIntoData(data, shiti_backup) {
        // 随机插入
        shiti_backup.forEach((item) => {
            const insertIndex = Math.floor(
                Math.random() * (data.synonyms.length + 1)
            );

            // 处理中文字段
            if (Array.isArray(item.synonym.中文)) {
                const shuffled = shuffleArray(item.synonym.中文);
                shuffled.push("无"); // 添加第七项
                item.synonym.中文 = shuffled;
            }

            // 插入到对应位置
            data.synonyms.splice(insertIndex, 0, item.synonym);
            data.answers.splice(insertIndex, 0, item.answer);
        });

        // 重新编号
        for (let i = 0; i < data.synonyms.length; i++) {
            const newIndex = i + 1;
            if (data.synonyms[i].hasOwnProperty("序号")) {
                data.synonyms[i]["序号"] = newIndex;
            }
            if (
                typeof data.answers[i] === "object" &&
                data.answers[i] !== null &&
                data.answers[i].hasOwnProperty("序号")
            ) {
                data.answers[i]["序号"] = newIndex;
            }
            if (data.synonyms[i]["排除"] === "试题") {
                data.answers[i]["正确答案"] = data.answers[i]["中文"];
            }
        }
    }

    // 是否增加拼写
    if (none_of_above && is_spell_number > 0 && !checkedSpell.value) {
        // 有拼写
        getSpellVocabulary(data["nid"])
            .then((res) => {
                // console.log('res: ', res);
                return res.flatMap((item) => {
                    lock_spell.value = Boolean(
                        item["lock_spell"] === "true" ||
                        item["lock_spell"] === true ||
                        item["lock_spell"] === 1
                    );
                    // console.log('item: ', item["data_words"]);
                    let dataString = item["data_words"]
                        .replace(/(\W)'|'(\W)/g, '$1"$2')
                        .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3');
                    return JSON.parse(dataString);
                });
            })
            .then((spell_vocabulary_list) => {
                if (spell_vocabulary_list.length > is_spell_number) {
                    // 随机选择 is_spell_number 个元素
                    const shuffled = spell_vocabulary_list.sort(
                        () => 0.5 - Math.random()
                    );
                    spell_vocabulary_list = shuffled.slice(0, is_spell_number);
                }
                // console.log("spell_vocabulary_list", spell_vocabulary_list);
                // 更新 data.synonyms
                data.synonyms.forEach((synonym) => {
                    synonym.is_spell = false;
                    spell_vocabulary_list.forEach((spellItem) => {
                        if (spellItem["英文"] === synonym["英文"]) {
                            synonym["中文"] = spellItem["中文"];
                            const getRandomEnglish = (englishText, correctAnswer) => {
                                // 如果答案是“以上都不对”，返回“正确答案”
                                if (englishText === "以上都不对") {
                                    // 如果正确答案中包含“；”，随机选择一个结果
                                    if (correctAnswer.includes("；")) {
                                        const options = correctAnswer.split("；");
                                        const randomIndex = Math.floor(
                                            Math.random() * options.length
                                        );
                                        return options[randomIndex];
                                    } else {
                                        // 不包含“；”，返回完整的正确答案
                                        return correctAnswer;
                                    }
                                } else {
                                    // 原有逻辑：处理包含 "；" 的情况，随机选择一个结果
                                    if (englishText.includes("；")) {
                                        const options = englishText.split("；");
                                        const randomIndex = Math.floor(
                                            Math.random() * options.length
                                        );
                                        return options[randomIndex];
                                    } else {
                                        // 不包含 "；"，返回原始字符串
                                        return englishText;
                                    }
                                }
                            };

                            synonym["英文"] = getRandomEnglish(
                                spellItem["答案"],
                                spellItem["正确答案"]
                            );
                            synonym.is_spell = true;
                        }
                    });
                });
                return data;
            })
            .then((data) => {
                // 分组处理
                function replaceOptionInSynonyms(data) {
                    // 获取所有 "正确答案" 列表
                    const correctAnswersMap = data.answers.reduce((map, answer) => {
                        map[answer.英文] = answer.中文; // 构建 英文 -> 中文 的映射
                        return map;
                    }, {});

                    // 遍历每个 synonym 项
                    data.synonyms.forEach((synonym) => {
                        // 检查是否存在 "选项" 字段，如果不存在则跳过
                        if (!synonym.hasOwnProperty("选项")) {
                            // console.log("跳过没有“选项”字段的项: ", synonym);
                            return; // 跳过当前循环，继续下一个
                        }

                        // 检查 "is_spell" 字段，如果为 true，则跳过
                        if (synonym.is_spell === true) {
                            // console.log("跳过 is_spell 为 true 的项: ", synonym);
                            return; // 跳过当前循环，继续下一个
                        }

                        const option = synonym["选项"];

                        // 检查 "选项" 不为 "" 且不为 undefined
                        if (option !== "" && option !== undefined) {
                            // console.log('option', option);
                            const correctAnswer = correctAnswersMap[synonym["英文"]]; // 获取对应的正确答案
                            const correctAnswerArray = correctAnswer.includes("；")
                                ? correctAnswer.split("；")
                                : [correctAnswer];
                            // console.log('synonym["英文"]: ', synonym["英文"]);
                            // console.log('correctAnswer: ', correctAnswer);
                            let availableIndices = [];

                            // 收集可以替换的索引（不包括“以上都不对”和“正确答案”）
                            synonym["中文"].forEach((item, index) => {
                                if (
                                    item !== "以上都不对" &&
                                    !correctAnswerArray.includes(item)
                                ) {
                                    availableIndices.push(index);
                                }
                            });

                            if (availableIndices.length > 0) {
                                // 如果选项包含 "/", 则拆分成多个选项
                                const options = option.includes("；")
                                    ? option.split("；")
                                    : [option];

                                // 替换多个选项
                                options.forEach((opt) => {
                                    // 如果选项已经存在于 "中文" 数组中，跳过
                                    if (synonym["中文"].includes(opt)) {
                                        // console.log(`选项“${opt}”已经存在，跳过`);
                                        return; // 跳过此选项，继续下一个
                                    }

                                    if (availableIndices.length > 0) {
                                        const randomIndex =
                                            availableIndices[
                                            Math.floor(Math.random() * availableIndices.length)
                                            ];
                                        // console.log(
                                        //   `在位置 ${randomIndex} 处替换“${synonym["中文"][randomIndex]}”为“${opt}”`
                                        // );
                                        synonym["中文"][randomIndex] = opt; // 随机位置替换选项内容

                                        // 替换后移除已使用的索引
                                        availableIndices = availableIndices.filter(
                                            (index) => index !== randomIndex
                                        );
                                    }
                                });
                            }
                        }
                    });

                    return data;
                }
                data = replaceOptionInSynonyms(data);

                return data;
            })
            .then((data) => {
                data = getZhenduoxuan(data);

                data.answers.forEach((item) => {
                    if (item.英文 === "for + 时间段") {
                        console.log("for + 时间段");
                        console.log("答案", item.中文);
                        console.log("正确答案", item.正确答案);
                    }
                });
                data.synonyms.forEach((item) => {
                    if (item.英文 === "for + 时间段") {
                        console.log("中文", item.中文);
                    }
                });
                return data;
            })
            .then((data) => {
                // 放回试题
                if (shiti_backup.length > 0) {
                    insertBackupIntoData(data, shiti_backup);
                }
                console.log("data_youpinxie: ", data);
                redirect();
            });
    } else {
        // 无拼写

        function replaceOptionInSynonyms(data) {
            // 获取所有 "正确答案" 列表
            const correctAnswersMap = data.answers.reduce((map, answer) => {
                map[answer.英文] = answer.中文; // 构建 英文 -> 中文 的映射
                return map;
            }, {});

            // 遍历每个 synonym 项
            data.synonyms.forEach((synonym) => {
                // 检查是否存在 "选项" 字段，如果不存在则跳过
                if (!synonym.hasOwnProperty("选项")) {
                    // console.log("跳过没有“选项”字段的项: ", synonym);
                    return; // 跳过当前循环，继续下一个
                }

                // 检查 "is_spell" 字段，如果为 true，则跳过
                if (synonym.is_spell === true) {
                    // console.log("跳过 is_spell 为 true 的项: ", synonym);
                    return; // 跳过当前循环，继续下一个
                }

                const option = synonym["选项"];

                // 检查 "选项" 不为 "" 且不为 undefined
                if (option !== "" && option !== undefined) {
                    const correctAnswer = correctAnswersMap[synonym["英文"]]; // 获取对应的正确答案
                    const correctAnswerArray = correctAnswer.includes("；")
                        ? correctAnswer.split("；")
                        : [correctAnswer];
                    // console.log('synonym["英文"]: ', synonym["英文"]);
                    // console.log('correctAnswer: ', correctAnswer);
                    let availableIndices = [];

                    // 收集可以替换的索引（不包括“以上都不对”和“正确答案”）
                    synonym["中文"].forEach((item, index) => {
                        if (item !== "以上都不对" && !correctAnswerArray.includes(item)) {
                            availableIndices.push(index);
                        }
                    });

                    if (availableIndices.length > 0) {
                        // 如果选项包含 "/", 则拆分成多个选项
                        const options = option.includes("；")
                            ? option.split("；")
                            : [option];

                        // 替换多个选项
                        options.forEach((opt) => {
                            // 如果选项已经存在于 "中文" 数组中，跳过
                            if (synonym["中文"].includes(opt)) {
                                // console.log(`选项“${opt}”已经存在，跳过`);
                                return; // 跳过此选项，继续下一个
                            }

                            if (availableIndices.length > 0) {
                                const randomIndex =
                                    availableIndices[
                                    Math.floor(Math.random() * availableIndices.length)
                                    ];
                                // console.log(
                                //   `在位置 ${randomIndex} 处替换“${synonym["中文"][randomIndex]}”为“${opt}”`
                                // );
                                synonym["中文"][randomIndex] = opt; // 随机位置替换选项内容

                                // 替换后移除已使用的索引
                                availableIndices = availableIndices.filter(
                                    (index) => index !== randomIndex
                                );
                            }
                        });
                    }
                }
            });

            return data;
        }

        data = replaceOptionInSynonyms(data);

        data = getZhenduoxuan(data);
        data.answers.forEach((item) => {
            if (item.英文 === "for + 时间段") {
                console.log("for + 时间段");
                console.log("答案", item.中文);
                console.log("正确答案", item.正确答案);
            }
        });
        data.synonyms.forEach((item) => {
            if (item.英文 === "for + 时间段") {
                // console.log("中文", item.中文);
                console.log("---");
                item.中文.forEach((item2) => {
                    console.log(item2);
                });
            }
        });
        // 放回试题
        if (shiti_backup.length > 0) {
            insertBackupIntoData(data, shiti_backup);
        }
        console.log("data_wupinxie: ", data);

        function printPlantDebug(data) {
            if (
                !data ||
                !Array.isArray(data.answers) ||
                !Array.isArray(data.synonyms)
            ) {
                console.warn("[plant-debug] data 结构不完整");
                return;
            }

            // 1️⃣ 打印 answers 中的 plant
            const plantAnswer = data.answers.find((a) => a.英文 === "fortune");

            console.log("========== 🌱 fortune DEBUG ==========");

            if (!plantAnswer) {
                console.warn("❌ answers 中未找到英文为 fortune 的项");
            } else {
                console.log("🧩 answers 中的 fortune");
                console.log("  英文:", plantAnswer.英文);
                console.log("  中文:", plantAnswer.中文);
                console.log("  正确答案:", plantAnswer.正确答案);
                console.log("  序号:", plantAnswer.序号);
            }

            // 2️⃣ 打印 synonyms 中对应的 plant 选项
            const plantSynonym = data.synonyms.find((s) => s.英文 === "fortune");

            if (!plantSynonym) {
                console.warn("❌ synonyms 中未找到英文为 fortune 的项");
            } else {
                console.log("🧩 synonyms 中的 fortune");
                console.log("  英文:", plantSynonym.英文);
                console.log("  序号:", plantSynonym.序号);

                if (Array.isArray(plantSynonym.中文)) {
                    console.log("  选项列表：");
                    plantSynonym.中文.forEach((opt, idx) => {
                        console.log(`    [${idx}]`, opt);
                    });
                } else {
                    console.log("  中文字段（非数组）:", plantSynonym.中文);
                }

                if ("选项" in plantSynonym) {
                    console.log("  选项字段(选项):", plantSynonym.选项);
                }
                if ("排除" in plantSynonym) {
                    console.log("  排除:", plantSynonym.排除);
                }
            }

            // 3️⃣ 对齐性检查（是否一致）
            if (plantAnswer && plantSynonym && Array.isArray(plantSynonym.中文)) {
                const matchInOptions = plantSynonym.中文.includes(plantAnswer.中文);
                console.log(
                    "🔍 answers.中文 是否在 synonym.中文 选项中:",
                    matchInOptions
                );

                if (!matchInOptions) {
                    console.warn(
                        "⚠️ 不一致：answers.中文 不存在于选项中（这是你现在的核心 bug）"
                    );
                }
            }

            console.log("====================================");
        }
        printPlantDebug(data);
        redirect();
    }

}
